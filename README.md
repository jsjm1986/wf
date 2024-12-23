# 任务分解系统

[English Version](README_EN.md)

一个基于网络的智能任务分解和分析系统，帮助用户将复杂任务分解为可管理的子任务，并提供全面的分析和可视化功能。

## 功能特点

### 1. 智能任务分解
- 基于DeepSeek API的智能任务分析和分解
- 多维度任务评估（复杂度、优先级、依赖关系等）
- 自动生成任务结构和关系图

### 2. 可视化展示
- 交互式思维导图展示
- 任务节点的展开/折叠功能
- 节点拖拽和重排功能
- 自定义节点样式和布局

### 3. 任务管理
- 任务进度跟踪
- 复杂度评估
- 依赖关系管理
- 优先级设置

### 4. 分析功能
- 资源需求分析
- 风险评估
- 时间线规划
- 建议生成

### 5. 协作功能
- 任务评论
- 进度更新
- 团队协作

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 可视化：vis.js
- API集成：DeepSeek API
- 样式框架：Material Design Icons

## 快速开始

1. 克隆项目
```bash
git clone [项目地址]
cd [项目目录]
```

2. 配置API密钥
在`app.js`中配置您的DeepSeek API密钥：
```javascript
this.apiKey = 'your-api-key';
```

3. 启动项目
- 使用任意Web服务器启动项目
- 或使用VS Code的Live Server插件

## 使用指南

### 1. 创建新任务
1. 填写主任务信息
2. 选择任务领域和复杂度
3. 设置时间约束
4. 点击"分解任务"按钮

### 2. 任务编辑
- 双击节点进行编辑
- 拖拽节点调整位置
- 使用工具栏进行缩放和导出

### 3. 进度跟踪
- 更新任务状态
- 添加进度说明
- 查看完成情况

### 4. 分析报告
- 查看资源分析
- 检查风险评估
- 参考时间线
- 查看建议

## 自定义配置

### 1. 模板配置
可以在`app.js`中添加自定义任务模板：
```javascript
const templates = {
    customTemplate: {
        domain: 'your-domain',
        complexity: 'your-complexity',
        timeConstraint: 'your-time-constraint',
        description: 'your-description',
        constraints: 'your-constraints'
    }
};
```

### 2. 样式定制
可以通过修改CSS变量自定义主题：
```css
:root {
    --primary-color: your-color;
    --secondary-color: your-color;
    --warning-color: your-color;
}
```

## 注意事项

1. API限制
- 请注意DeepSeek API的调用限制
- 建议实现适当的缓存机制

2. 浏览器兼容性
- 推荐使用现代浏览器（Chrome, Firefox, Safari, Edge）
- 需要启用JavaScript

3. 数据保存
- 定期保存重要数据
- 可以使用导出功能备份

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 发起 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至 [您的邮箱]

## 更新日志

### v1.0.0 (2024-01)
- 初始版本发布
- 基础功能实现
- 可视化展示 