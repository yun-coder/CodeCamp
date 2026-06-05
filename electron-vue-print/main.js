const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('node:path');
const Stomp = require('stompjs');
const WebSocket = require('ws');
const {exec} = require('child_process');
const util = require('util');
const {reactive} = require("vue");
const execPromise = util.promisify(exec);
let pageSize = reactive({
    width: 60000,
    height: 40000,
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
                encoding: 'utf8',
                maxBuffer: 1024 * 1024
            });

            if (stdout && stdout.trim() !== '') {
                const jobs = JSON.parse(stdout);
                allJobs = Array.isArray(jobs) ? jobs : [jobs];
            }
        } else {
            // 获取所有打印机列表
            const getPrintersCommand = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"`;
            const {stdout: printersOutput} = await execPromise(getPrintersCommand, {
                encoding: 'utf8',
                maxBuffer: 1024 * 1024
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
                        encoding: 'utf8',
                        maxBuffer: 1024 * 1024
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
            encoding: 'utf8',
            maxBuffer: 1024 * 1024
        });

        if (winApiStdout && winApiStdout.trim() !== '') {
            const printerName = winApiStdout.trim();
            console.log(`通过WMI找到默认打印机: ${printerName}`);
            return printerName;
        }

        // 如果WMI方式失败，使用Get-Printer命令
        const command = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object -ExpandProperty Name"`;
        const {stdout, stderr} = await execPromise(command, {
            encoding: 'utf8',
            maxBuffer: 1024 * 1024
        });

        if (stdout && stdout.trim() !== '') {
            const printerName = stdout.trim();
            console.log(`通过Get-Printer找到默认打印机: ${printerName}`);
            return printerName;
        }

        // 最后尝试使用.NET方式获取默认打印机
        const dotNetCommand = `powershell -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Drawing; [System.Drawing.Printing.PrinterSettings]::new().PrinterName"`;
        const {stdout: dotNetStdout} = await execPromise(dotNetCommand, {
            encoding: 'utf8',
            maxBuffer: 1024 * 1024
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
    const ws = new WebSocket('ws://192.168.2.170:8082/pms/endpoint');
    const stompClient = Stomp.over(ws);
    stompClient.connect(
        {
            userCode: '218817272071061505',
        },
        (frame) => {
            stompClient.subscribe('/user/bubble', async (message) => {
                try {
                    // console.log(message.body);
                } catch (e) {
                    console.log('websocket error:', e);
                }
            });
        },
        (error) => {
            console.error('STOMP error:', error);
        }
    );
}


function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
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
                encoding: 'utf8',
                maxBuffer: 1024 * 1024
            });

            if (!stdout || stdout.trim() === '') {
                return [];
            }

            const printers = JSON.parse(stdout);
            const printerList = Array.isArray(printers) ? printers : [printers];

            // 转换为前端需要的格式
            return printerList.map(p => ({
                name: p.Name,
                displayName: p.Name,
                isDefault: p.IsDefault || false,
                status: p.Status || 0
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
            show: false,
            webPreferences: {
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
            silent: true,
            printBackground: true,
            pageSize: pageSize,
            deviceName: printerName,
            margins: {
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
            show: false,
            webPreferences: {
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
            silent: true,
            printBackground: true,
            pageSize: pageSize,
            deviceName: printerName,
            margins: {
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

    // 页面加载完成后连接WebSocket
    mainWindow.webContents.on('did-finish-load', () => {
        connectSocket();
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
