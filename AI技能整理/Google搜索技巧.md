# Google 搜索技巧（已核验版）

## 使用说明

把下面的占位符替换成实际内容：

- `{产品英文}`：产品英文名，例如 `solar garden light`
- `{目标国家英文}`：目标国家或地区，例如 `Germany`
- `{品牌名}`：从 Amazon、Shopee、eBay 等平台找到的品牌名

Google 搜索中建议使用：

- `"完整短语"`：精确搜索短语
- `site:网站域名`：限定网站
- `-关键词`：排除噪音
- `filetype:pdf`：只搜索 PDF 文件
- `intitle:`：尝试限定网页标题

注意：

- 不要使用 `+` 连接关键词，普通空格即可。
- 不要写 `importer|distributor|wholesaler`，建议分别搜索三次，结果更准确。
- `-alibaba` 前面必须有空格。
- 多词国家或地区要加引号，例如 `"United Arab Emirates"`。
- `phone` 容易匹配网页模板或登录页面，优先使用 `WhatsApp`、`contact`、`email` 等词。

## 1. LinkedIn：寻找进口商、分销商和采购人员

原写法中的进口商关键词存在拼写错误，正确写法是 `importer`。不要只搜索 `buying manager`，还应搜索采购、品类和供应链相关职位。

### 采购人员

```text
site:linkedin.com/in/ "{产品英文}" "{目标国家英文}" "purchasing manager" -alibaba
site:linkedin.com/in/ "{产品英文}" "{目标国家英文}" "procurement manager" -alibaba
site:linkedin.com/in/ "{产品英文}" "{目标国家英文}" "sourcing manager" -alibaba
site:linkedin.com/in/ "{产品英文}" "{目标国家英文}" "category manager" -alibaba
site:linkedin.com/in/ "{产品英文}" "{目标国家英文}" "merchandising manager" -alibaba
```

### 进口商和分销商公司

```text
site:linkedin.com/company/ "{产品英文}" importer "{目标国家英文}" -alibaba
site:linkedin.com/company/ "{产品英文}" distributor "{目标国家英文}" -alibaba
site:linkedin.com/company/ "{产品英文}" wholesaler "{目标国家英文}" -alibaba
```

### 常用职位关键词

```text
buying manager
purchasing manager
procurement manager
sourcing manager
category manager
merchandising manager
import manager
```

找到公司后，再搜索：

```text
"公司名称" contact
"公司名称" wholesale
"公司名称" importer
"公司名称" private label
```

## 2. Facebook：寻找企业页面

`intitle:` 可以尝试，但不能保证只返回企业页面。必须加上 `site:facebook.com`，并使用企业联系方式关键词。

```text
site:facebook.com "{产品英文}" supplier "{目标国家英文}" WhatsApp
site:facebook.com "{产品英文}" wholesaler "{目标国家英文}" contact
site:facebook.com "{产品英文}" distributor "{目标国家英文}" email
site:facebook.com intitle:"{产品英文}" supplier WhatsApp
```

如果需要查电话，可以使用：

```text
site:facebook.com "{产品英文}" supplier "Call us" "{目标国家英文}"
```

不要只使用 `phone` 判断页面有真实联系方式，因为它可能匹配 Facebook 登录页面的模板文字。

## 3. Instagram：寻找分销商和批发商

原来的 Instagram 查询缺少空格和网站限定。Google 对 Instagram 的收录不完整，搜索结果只能作为线索，最终应打开主页确认简介、官网和 WhatsApp。

```text
site:instagram.com "{产品英文}" distributor WhatsApp
site:instagram.com "{产品英文}" wholesaler "{目标国家英文}"
site:instagram.com "{产品英文}" supplier contact
site:instagram.com "{产品英文}" "link in bio"
```

Instagram 站内也可以搜索：

```text
#{产品关键词}
#{产品关键词}wholesale
#{产品关键词}distributor
```

## 4. YouTube：寻找测评博主、零售商线索和产品渠道

`unboxing + business inquiry` 不能直接证明对方是进口商。Unboxing 结果通常是测评视频或消费者内容，应进一步查看频道简介、视频描述和外部链接。

```text
site:youtube.com/watch "{产品英文}" unboxing
site:youtube.com/watch "{产品英文}" review contact
site:youtube.com/watch "{产品英文}" wholesale
site:youtube.com/watch "{产品英文}" "business inquiry"
```

如果目标是寻找商业客户，重点查看：

- 频道所在国家
- 视频描述中的官网或店铺链接
- 是否有 wholesale、retailer、distributor 等词
- 是否公开企业邮箱或企业 WhatsApp

## 5. Pinterest：寻找小零售商和品牌线索

Pinterest 不适合单独确认对方是零售商，更适合通过图片、品牌和外链发现潜在客户。

```text
site:pinterest.com "{产品英文}" retailer
site:pinterest.com "{产品英文}" "private label"
site:pinterest.com "{产品英文}" brand
site:pinterest.com "{产品英文}" wholesale
```

找到 Pin 或图板后，打开其外部链接，确认是否存在真实的零售网站、品牌官网或采购页面。

## 6. Amazon、Shopee、eBay：先找品牌，再反查客户

直接搜索“产品词 + 联系方式”通常不稳定。更可靠的方法是先找到品牌、店铺或产品型号，再搜索品牌官网和批发渠道。

### 第一步：寻找品牌和店铺

```text
site:amazon.com "{产品英文}"
site:shopee.com "{产品英文}" "{目标国家英文}"
site:ebay.com "{产品英文}" "{目标国家英文}"
```

### 第二步：反查品牌和联系方式

```text
"{品牌名}" wholesale
"{品牌名}" distributor
"{品牌名}" importer
"{品牌名}" contact
"{品牌名}" private label
```

找到品牌官网后：

```text
site:{品牌官网} contact
site:{品牌官网} wholesale
site:{品牌官网} distributor
site:{品牌官网} "become a retailer"
```

## 7. PDF：批量寻找展商名录和行业报告

`filetype:pdf` 是有效的搜索方式，但不要把展商名录和市场报告写在同一条含糊查询中。应拆成不同查询，或分别搜索展商名录、买家名录和市场报告。

### 展商名录

```text
filetype:pdf "exhibitor list" "{产品英文}" "{目标国家英文}"
filetype:pdf "exhibitor directory" "{产品英文}" "{目标国家英文}"
filetype:pdf "fair catalogue" "{产品英文}" "{目标国家英文}"
```

### 进口商、分销商和买家名录

```text
filetype:pdf "importer directory" "{产品英文}" "{目标国家英文}"
filetype:pdf "distributor directory" "{产品英文}" "{目标国家英文}"
filetype:pdf "buyer list" "{产品英文}" "{目标国家英文}"
filetype:pdf "attendee directory" "{产品英文}" "{目标国家英文}"
```

### 市场报告

```text
filetype:pdf "market report" "{产品英文}" importer
filetype:pdf "market report" "{产品英文}" distributor
filetype:pdf "industry report" "{产品英文}" "{目标国家英文}"
```

可以在查询中加入年份，例如：

```text
filetype:pdf "exhibitor list" lighting Germany 2026
```

注意：`exhibitor list` 通常是供应商名录，不一定是买家名录。找客户时应优先搜索 `buyer list`、`attendee directory` 和 `distributor directory`。

## 8. 推荐的搜索流程

1. 先用产品词、国家和客户角色搜索。
2. 对 `importer`、`distributor`、`wholesaler` 分别执行查询，不要全部粘在一条语句中。
3. 找到公司名称后，搜索官网、批发页面、采购页面和联系方式。
4. 至少确认以下四项：
   - 产品确实相关
   - 公司位于目标国家或服务目标国家
   - 公司具有进口、批发、分销或零售业务
   - 联系方式属于公开的企业联系方式
5. 记录公司名、官网、国家、客户类型、来源页面和验证日期。

## 9. 通用查询模板

```text
site:目标网站 "{产品英文}" "{客户角色}" "{目标国家英文}" -噪音关键词
```

示例：

```text
site:linkedin.com/company/ "solar garden light" distributor Germany -alibaba
site:facebook.com "solar garden light" wholesaler Germany WhatsApp
site:instagram.com "solar garden light" retailer Germany
filetype:pdf "distributor directory" "solar lighting" Germany
```
