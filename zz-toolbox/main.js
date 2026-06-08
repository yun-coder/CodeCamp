const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('node:path');
const WebSocket = require('ws');
const {exec} = require('child_process');
const util = require('util');
const {reactive} = require("vue");

// 全局变量，用于跟踪是否通过自定义协议启动
let isProtocolLaunch = false;

// 获取单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // 如果获取锁失败，说明已经有另一个实例在运行
    // 退出当前实例，让主实例处理自定义协议
    app.quit();
}
const execPromise = util.promisify(exec);
let pageSize = reactive({
    width: 60000, height: 40000,
});

// 获取打印任务列表
async function getPrintJobs(printerName = null) {
    try {
        let allJobs = [];

        if (printerName) {
            // 查询指定打印机的任务
            const escapedName = printerName.replace(/'/g, "''");
            const command = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-PrintJob -PrinterName '${escapedName}' | Select-Object Id, DocumentName, UserName, JobStatus, TotalPages, Size, @{Name='PrinterName';Expression={'${escapedName}'}} | ConvertTo-Json"`;
            const {stdout} = await execPromise(command, {
                encoding: 'utf8', maxBuffer: 1024 * 1024
            });

            if (stdout && stdout.trim() !== '') {
                const jobs = JSON.parse(stdout);
                allJobs = Array.isArray(jobs) ? jobs : [jobs];
            }
        } else {
            // 获取所有打印机列表
            const getPrintersCommand = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"`;
            const {stdout: printersOutput} = await execPromise(getPrintersCommand, {
                encoding: 'utf8', maxBuffer: 1024 * 1024
            });

            if (!printersOutput || printersOutput.trim() === '') {
                return [];
            }

            const printers = JSON.parse(printersOutput);
            const printerList = Array.isArray(printers) ? printers : [printers];

            // 遍历每个打印机获取任务
            for (const printer of printerList) {
                try {
                    const escapedName = printer.replace(/'/g, "''");
                    const command = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-PrintJob -PrinterName '${escapedName}' | Select-Object Id, DocumentName, UserName, JobStatus, TotalPages, Size, @{Name='PrinterName';Expression={'${escapedName}'}} | ConvertTo-Json"`;
                    const {stdout} = await execPromise(command, {
                        encoding: 'utf8', maxBuffer: 1024 * 1024
                    });

                    if (stdout && stdout.trim() !== '') {
                        const jobs = JSON.parse(stdout);
                        const jobList = Array.isArray(jobs) ? jobs : [jobs];
                        allJobs = allJobs.concat(jobList);
                    }
                } catch (err) {
                    // 某个打印机查询失败时继续查询其他打印机
                    console.log(`查询打印机 ${printer} 的任务失败:`, err.message);
                }
            }
        }

        return allJobs;
    } catch (error) {
        console.error('获取打印任务失败:', error);
        throw error;
    }
}


// 获取默认打印机名称
async function getDefaultPrinterName() {
    try {
        // 首先尝试使用Windows API方式获取默认打印机
        const winApiCommand = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true}).Name"`;
        const {stdout: winApiStdout} = await execPromise(winApiCommand, {
            encoding: 'utf8', maxBuffer: 1024 * 1024
        });

        if (winApiStdout && winApiStdout.trim() !== '') {
            const printerName = winApiStdout.trim();
            console.log(`通过WMI找到默认打印机: ${printerName}`);
            return printerName;
        }

        // 如果WMI方式失败，使用Get-Printer命令
        const command = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"`;
        const {stdout, stderr} = await execPromise(command, {
            encoding: 'utf8', maxBuffer: 1024 * 1024
        });

        if (stdout && stdout.trim() !== '') {
            const printerName = stdout.trim();
            console.log(`通过Get-Printer找到默认打印机: ${printerName}`);
            return printerName;
        }

        // 最后尝试使用.NET方式获取默认打印机
        const dotNetCommand = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Drawing; [System.Drawing.Printing.PrinterSettings]::new().PrinterName"`;
        const {stdout: dotNetStdout} = await execPromise(dotNetCommand, {
            encoding: 'utf8', maxBuffer: 1024 * 1024
        });

        if (dotNetStdout && dotNetStdout.trim() !== '') {
            const printerName = dotNetStdout.trim();
            console.log(`通过.NET找到默认打印机: ${printerName}`);
            return printerName;
        }

        console.error('无法找到系统默认打印机，请检查打印机设置');
        throw new Error('系统中没有设置默认打印机');
    } catch (error) {
        console.error('获取默认打印机失败:', error);
        throw new Error(`获取默认打印机失败: ${error.message}`);
    }
}

// 连接WebSocket服务
function connectSocket() {
    const wsToken = global.wsToken;
    const baseUrl = global.wsUrl || 'ws://192.168.2.113:8010/infra/ws';
    // const baseUrl = global.wsUrl || 'ws://192.168.2.33:8010/infra/ws';
    console.log(`正在连接WebSocket服务`);
    const wsUrl = `${baseUrl}?printToken=${wsToken}`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        const subscribeMessage = {
            type: global.printType, content: JSON.stringify({
                printToken: wsToken
            })
        };
        ws.send(JSON.stringify(subscribeMessage));
        console.log('WebSocket连接成功');
    });

    ws.on('message', async (data) => {
        console.log('收到WebSocket消息:', data.toString());
        const message = JSON.parse(data.toString());
        if (message.type === 'device-info') {
            const content = JSON.parse(message.content);
            // 批量打印条形码
            if (content.devices && Array.isArray(content.devices) && content.devices.length > 0) {
                // console.log(`开始批量打印 ${content.devices.length} 个设备的条形码`);

                // 发送打印开始事件
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('print-start', {count: content.devices.length});
                }

                for (let i = 0; i < content.devices.length; i++) {
                    const device = content.devices[i];
                    // console.log(`正在打印第 ${i + 1} 个设备:`, device);

                    try {
                        // 获取默认打印机
                        const printerName = await getDefaultPrinterName();
                        // console.log(`准备使用默认打印机进行条形码打印: ${printerName}`);

                        // 创建打印窗口
                        const printWindow = new BrowserWindow({
                            show: false, webPreferences: {
                                nodeIntegration: true,
                            },
                        });

                        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    body { margin: 0; padding: 0; }
                    #barcode { display: block; width: 80%; margin: 0 auto; height: 70px; }
                    .info { text-align: left; margin: 4px 0 0 4px; font-size: 14px; }
                    .info-item { margin: 2px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <svg id="barcode"></svg>
                    <div class="info">
                        <div class="info-item">设备编号: ${device.deviceCode || ''}</div>
                        <div class="info-item">设备名称: ${device.deviceName || ''}</div>
                        <div class="info-item">安装地点: ${device.installLocation || ''}</div>
                    </div>
                </div>
                <script>
                    JsBarcode("#barcode",JSON.stringify({id: ${device.id}}), {
                        format: "CODE128",
                        width: 4,
                        height: 140,
                        displayValue: false,
                        fontSize: 14,
                    });
                </script>
            </body>
            </html>
            `;

                        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

                        const options = {
                            silent: true, printBackground: true, pageSize: pageSize, deviceName: printerName, margins: {
                                marginType: 'none',
                            },
                        };

                        printWindow.webContents.print(options, (success) => {
                            printWindow.destroy();
                            if (success) {
                                console.log(`条形码打印成功，使用打印机: ${printerName}`);
                            } else {
                                console.error(`条形码打印失败，打印机: ${printerName}`);
                            }
                        });
                    } catch (error) {
                        console.error(`打印条形码失败:`, error);
                    }
                }

                console.log('批量条形码打印完成');

                // 发送打印结束事件
                if (mainWindow) {
                    mainWindow.webContents.send('print-end');
                }
            }
        }

        if (message.type === 'task-info') {
            const content = JSON.parse(message.content);

            // 批量打印条形码
            if (content.tasks && Array.isArray(content.tasks) && content.tasks.length > 0) {
                // console.log(`开始批量打印 ${content.tasks.length} 个设备的条形码`);

                // 发送打印开始事件
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('print-start', {count: content.tasks.length});
                }

                for (let i = 0; i < content.tasks.length; i++) {
                    const task = content.tasks[i];
                    // console.log(`正在打印第 ${i + 1} 个设备:`, device);

                    try {
                        // 获取默认打印机
                        const printerName = await getDefaultPrinterName();
                        console.log(`准备使用默认打印机进行条形码打印: ${printerName}`);

                        // 创建打印窗口
                        const printWindow = new BrowserWindow({
                            show: false, webPreferences: {
                                nodeIntegration: true,
                            },
                        });

                        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    body { margin: 0; padding: 0; }
                    #barcode { display: block; width: 90%; margin: 0 auto; height: 70px; }
                    .info { text-align: left; margin: 2px 0 0 2px; font-size: 12px; }
                    .info-item { margin: 2px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <svg id="barcode"></svg>
                    <div class="info">
                        <div class="info-item">任务单号: ${task.taskNumber || ''}</div>
                        <div class="info-item">批次号: ${task.batchNumber || ''}</div>
                        <div class="info-item">物料编码: ${task.materialCode || ''}</div>
                        <div class="info-item">计划生产数量: ${task.plannedQuantity || ''}</div>
                    </div>
                </div>
                <script>
                    JsBarcode("#barcode",JSON.stringify({taskId: ${task.taskId}}), {
                        format: "CODE128",
                        width: 4,
                        height: 120,
                        displayValue: false,
                        fontSize: 14,
                    });
                </script>
            </body>
            </html>
            `;

                        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

                        const options = {
                            silent: true, printBackground: true, pageSize: pageSize, deviceName: printerName, margins: {
                                marginType: 'none',
                            },
                        };

                        printWindow.webContents.print(options, (success) => {
                            printWindow.destroy();
                            if (success) {
                                console.log(`条形码打印成功，使用打印机: ${printerName}`);
                            } else {
                                console.error(`条形码打印失败，打印机: ${printerName}`);
                            }
                        });
                    } catch (error) {
                        console.error(`打印条形码失败:`, error);
                    }
                }

                console.log('批量条形码打印完成');

                // 发送打印结束事件
                if (mainWindow) {
                    mainWindow.webContents.send('print-end');
                }
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });

    ws.on('close', () => {
        console.log('WebSocket连接关闭');
    });
}


function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800, height: 600, show: true, webPreferences: {
            nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.loadFile('dist/index.html');

    // mainWindow.webContents.openDevTools();

    // 获取打印机列表
    ipcMain.handle('get-printers', async (event) => {
        try {
            // 使用 PowerShell 获取打印机列表，避免编码问题
            const command = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object Name, @{Name='IsDefault';Expression={$_.Default}}, @{Name='Status';Expression={$_.PrinterStatus}} | ConvertTo-Json"`;
            const {stdout} = await execPromise(command, {
                encoding: 'utf8', maxBuffer: 1024 * 1024
            });

            if (!stdout || stdout.trim() === '') {
                return [];
            }

            const printers = JSON.parse(stdout);
            const printerList = Array.isArray(printers) ? printers : [printers];

            // 转换为前端需要的格式
            return printerList.map(p => ({
                name: p.Name, displayName: p.Name, isDefault: p.IsDefault || false, status: p.Status || 0
            }));
        } catch (e) {
            console.error('获取打印机列表失败:', e);
            throw new Error('获取失败');
        }
    });

    // 设置打印参数
    ipcMain.handle('set-print-params', async (event, content) => {
        pageSize = {...content};
    })

    // 设置WebSocket token
    ipcMain.handle('set-ws-token', async (event, token) => {
        global.wsToken = token;
        // global.printType = 'device-print-subscribe';
        global.printType = 'task-print-subscribe';
        console.log(`设置WebSocket令牌: ${token}`);
        connectSocket();
    })

    // 设置WebSocket URL
    ipcMain.handle('set-ws-url', async (event, url) => {
        global.wsUrl = url;
        console.log(`设置WebSocket URL: ${url}`);
    })

    // 获取打印任务列表
    ipcMain.handle('get-print-jobs', async (event, printerName) => {
        try {
            return await getPrintJobs(printerName);
        } catch (e) {
            return [];
        }
    });


    // 二维码打印处理 - 打印设计器canvas内容
    ipcMain.handle('silent-print-qrcode', async (_, content, canvasDataURL) => {
        try {
            const printerName = await getDefaultPrinterName();
            console.log(`准备使用默认打印机进行打印: ${printerName}`);

            const printWindow = new BrowserWindow({
                show: false, webPreferences: {
                    nodeIntegration: true,
                },
            });

            // 创建临时HTML内容来显示canvas图像
            const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { margin: 0; padding: 0; }
                img { display: block; width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <img src="${canvasDataURL}" alt="QR Code" />
        </body>
        </html>
        `;

            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

            const options = {
                silent: true, printBackground: true, pageSize: pageSize, deviceName: printerName, margins: {
                    marginType: 'none',
                },
            };

            printWindow.webContents.print(options, (success) => {
                printWindow.destroy();
                if (success) {
                    console.log(`二维码打印成功，使用打印机: ${printerName}`);
                } else {
                    console.error(`二维码打印失败，打印机: ${printerName}`);
                }
            });
        } catch (error) {
            console.error('二维码打印处理失败:', error);
            throw new Error(`打印失败: ${error.message}`);
        }
    });

    // 条形码打印处理 - 打印设计器canvas内容
    ipcMain.handle('silent-print-barcode', async (_, content, canvasDataURL) => {
        try {
            const printerName = await getDefaultPrinterName();
            console.log(`准备使用默认打印机进行条形码打印: ${printerName}`);

            const printWindow = new BrowserWindow({
                show: false, webPreferences: {
                    nodeIntegration: true,
                },
            });

            // 创建临时HTML内容来显示canvas图像
            const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { margin: 0; padding: 0; }
                img { display: block; width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <img src="${canvasDataURL}" alt="Barcode" />
        </body>
        </html>
        `;

            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

            const options = {
                silent: true, printBackground: true, pageSize: pageSize, deviceName: printerName, margins: {
                    marginType: 'none',
                },
            };

            printWindow.webContents.print(options, (success) => {
                printWindow.destroy();
                if (success) {
                    console.log(`条形码打印成功，使用打印机: ${printerName}`);
                } else {
                    console.error(`条形码打印失败，打印机: ${printerName}`);
                }
            });
        } catch (error) {
            console.error('条形码打印处理失败:', error);
            throw new Error(`打印失败: ${error.message}`);
        }
    });

    // 页面加载完成后，检查是否已有token并连接WebSocket
    mainWindow.webContents.on('did-finish-load', async () => {
        console.log('页面加载完成');
        // 如果已经有token，则连接WebSocket
        if (global.wsToken) {
            console.log('检测到已有token，连接WebSocket');
            connectSocket();
        } else {
            console.log('未检测到token，等待通过自定义协议设置');
        }
    });
}

// 注册自定义协议
app.setAsDefaultProtocolClient('zhongzao-print');

// 处理自定义协议URL的函数
function handleProtocolUrl(url) {
    console.log('处理自定义协议URL:', url);
    isProtocolLaunch = true; // 标记为通过自定义协议启动
    try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        const printType = urlObj.searchParams.get('type');

        if (token) {
            console.log('从自定义协议中提取到token:', token);
            global.wsToken = token;
            global.printType = printType;
            connectSocket();
        } else {
            console.warn('自定义协议URL中未找到token参数');
        }
    } catch (error) {
        console.error('解析自定义协议URL失败:', error);
    }
}

// Windows平台处理自定义协议唤起
app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 检查是否有命令行参数
    if (commandLine.length > 1) {
        // 获取自定义协议URL
        const url = commandLine[commandLine.length - 1];
        console.log('收到自定义协议URL (Windows):', url);
        handleProtocolUrl(url);
    }

    // 聚焦到主窗口
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        // 如果是通过自定义协议唤醒，则不显示窗口
        if (!isProtocolLaunch) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    }
});

// macOS平台处理自定义协议唤起
app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('收到自定义协议URL (macOS):', url);

    // 从URL中提取token
    try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');

        if (token) {
            console.log('从自定义协议中提取到token:', token);
            global.wsToken = token;
            connectSocket();
        } else {
            console.warn('自定义协议URL中未找到token参数');
        }
    } catch (error) {
        console.error('解析自定义协议URL失败:', error);
    }
});

app.whenReady().then(() => {
    createWindow();

    // 检查是否通过自定义协议启动（Windows第一次启动）
    if (process.platform === 'win32' && process.argv.length > 1) {
        const lastArg = process.argv[process.argv.length - 1];
        if (lastArg.startsWith('zhongzao-print://')) {
            handleProtocolUrl(lastArg);
        }
    }

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
