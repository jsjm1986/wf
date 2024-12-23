// 在 TaskDecomposer 类之前定义 TaskProgress 类
class TaskProgress {
    constructor(task) {
        this.task = task;
        this.status = 'pending'; // pending, in-progress, completed
        this.progress = 0;
        this.startTime = null;
        this.endTime = null;
        this.notes = [];
    }

    updateProgress(progress) {
        this.progress = Math.min(100, Math.max(0, progress));
        if (this.progress === 0) {
            this.status = 'pending';
        } else if (this.progress === 100) {
            this.status = 'completed';
            this.endTime = new Date();
        } else {
            this.status = 'in-progress';
            if (!this.startTime) {
                this.startTime = new Date();
            }
        }
    }

    addNote(note) {
        this.notes.push({
            content: note,
            timestamp: new Date(),
            progress: this.progress
        });
    }
}

class TaskDecomposer {
    constructor() {
        this.apiKey = 'sk-da4118aeaa5a4289b16228882f7dac68';
        this.apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        this.maxRetries = 3;  // 最大重试次数
        this.retryDelay = 1000;  // 重试延迟（毫秒）
        
        // 初始化 taskProgress
        this.taskProgress = new Map();
        
        // 初始化其他属性
        this.init();
        this.checkFontLoading();
        
        // 加载保存的数据
        this.loadProjectData();
        
        // 设置自动保存
        this.autoSaveInterval = setInterval(() => this.saveProjectData(), 60000); // 每分钟自动保存
    }

    init() {
        // 获取所有必要的DOM元素
        this.decomposeBtn = document.getElementById('decomposeBtn');
        this.mainTaskInput = document.getElementById('mainTask');
        this.subtasksContainer = document.getElementById('subtasks');
        this.analysisContainer = document.getElementById('task-analysis');
        this.suggestionsContainer = document.querySelector('#task-analysis .suggestions-container');
        this.feedbackContainer = document.querySelector('.feedback-wrapper .feedback-container');
        this.statusContainer = document.getElementById('status');

        // 添加事件监听器
        if (this.decomposeBtn) {
            this.decomposeBtn.addEventListener('click', () => this.handleDecomposition());
        }

        this.initTabHandlers();
        this.initResetHandler();
        this.handleTemplates();
        this.initCollaboration();
        this.initExport();
    }

    initTabHandlers() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const panes = document.querySelectorAll('.tab-pane');
                panes.forEach(pane => pane.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }

    initResetHandler() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetForm();
        });
    }

    resetForm() {
        document.getElementById('mainTask').value = '';
        document.getElementById('constraints').value = '';
        document.getElementById('domainSelect').value = 'general';
        document.getElementById('complexityLevel').value = 'simple';
        document.getElementById('timeConstraint').value = '';
        this.clearResults();
    }

    clearResults() {
        ['task-analysis', 'subtasks', 'resources', 'risks', 'timeline'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });
        document.getElementById('mindmap').innerHTML = '';
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('feedback').innerHTML = '';
    }

    async handleDecomposition() {
        const mainTask = document.getElementById('mainTask').value;
        const constraints = document.getElementById('constraints').value;
        const domain = document.getElementById('domainSelect').value;
        const complexity = document.getElementById('complexityLevel').value;
        const timeConstraint = document.getElementById('timeConstraint').value;

        if (!mainTask) {
            this.updateStatus('请输入任务内容', 'error');
            return;
        }

        try {
            this.updateStatus('正在处理...', 'processing');
            
            // 收集上下文信息
            const context = {
                task: mainTask,
                constraints,
                domain,
                complexity,
                timeConstraint
            };

            // 第一阶段：任务理解和分类
            this.updateStatus('正在分析任务类型...', 'processing');
            const taskAnalysis = await this.analyzeTaskType(context);
            this.displayTaskAnalysis(taskAnalysis);
            
            // 第二阶段：任务分解
            this.updateStatus('正在分解任务...', 'processing');
            const subtasks = await this.decomposeTask(context, taskAnalysis);
            this.displaySubtasks(subtasks);
            
            // 创建思维导图
            this.createMindMap(mainTask, subtasks);
            
            // 第三阶段：资源分析
            this.updateStatus('正在分析资源需求...', 'processing');
            const resources = await this.analyzeResources(subtasks);
            this.displayResources(resources);
            
            // 第四阶段：风险分析
            this.updateStatus('正在评估风险...', 'processing');
            const risks = await this.analyzeRisks(context, subtasks);
            this.displayRisks(risks);
            
            // 第五阶段：时间线规划
            this.updateStatus('正在制定时间线...', 'processing');
            const timeline = await this.createTimeline(subtasks, timeConstraint);
            this.displayTimeline(timeline);
            
            // 最终阶段：生成建议
            this.updateStatus('正在生成建议...', 'processing');
            const suggestions = await this.generateSuggestions({
                context,
                taskAnalysis,
                subtasks,
                resources,
                risks,
                timeline
            });
            this.displaySuggestions(suggestions);
            
            this.updateStatus('分析完成', 'success');

        } catch (error) {
            console.error('处理过程中出错:', error);
            this.updateStatus('处理失败: ' + error.message, 'error');
            this.displayFeedback([{
                type: 'error',
                message: '处理任务时发生错误，请稍后重试或联系支持团队'
            }]);
        }
    }

    async analyzeTaskType(context) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为任务分析专家，请从以下维度深入分析任务：
1. 任务领域特征：明确任务所属的专业领域和特定背景
2. 复杂度评估：从技术、管理、协调等多个维度评估难度
3. 关键���功因素：识别影响任务成功的关键要素
4. 约束条件分析：评估各类限制因素的影响
5. 创新机会：发现可能的优化和创新点`
                },
                {
                    role: "user",
                    content: `请分析以下任务：
${JSON.stringify(context, null, 2)}

请提供：
1. 详细的领域分析和任务特征
2. 多维度的复杂度评估
3. 关键成功因素清单
4. 约束条件的影响分析
5. 潜在的创新机会建议`
                }
            ]
        });

        if (!response.choices || !response.choices[0]?.message?.content) {
            throw new Error('任务分析响应格式不正确');
        }

        return response.choices[0].message.content;
    }

    async decomposeTask(task, analysis) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为任务分解专家，请遵循以下原则：
1. 层次性：确保子任务之间有清晰的层次关系
2. 独立性：每个子任务应相对独立，便于并行处理
3. 可执行性：子任务应具体且可操作
4. 完整性：子任务的总和应覆盖原任务的所有方面
5. 依赖关系：明确任务之间的依赖关系`
                },
                {
                    role: "user",
                    content: `基于以下任务分析：${analysis}\n
请将此任务分解为具体的子任务：${task}\n
要求：
1. 每个子任务都要有明确的输入和输出
2. 标注子任务之间的依赖关系
3. 估计每个子任务的复杂度（1-5分）
4. 为每个子任务添加完成标准`
                }
            ]
        });
        return this.parseSubtasks(response);
    }

    async analyzeSubtasks(subtasks) {
        const results = [];
        for (const subtask of subtasks) {
            const response = await this.callDeepseekAPI({
                messages: [
                    {
                        role: "system",
                        content: `作为专业的任务分析师，请对每个子任务进行深入分析。分析应包含：
1. 执行步骤的详细分解
2. 所需资源的具体清单
3. 潜在风险和应对策略
4. 质量控制措施
5. 与其他子任务的接口定义`
                    },
                    {
                        role: "user",
                        content: `请详细分析以下子任务：${subtask}\n
请提供：
1. 详细的执行步骤（至少3个关键步骤）
2. 每个步骤所需的具体资源
3. 可能遇到的具体问题和解决方案
4. 完成标准和验证方法
5. 与其他任务的数据交换需求`
                    }
                ]
            });
            results.push({
                subtask,
                analysis: response.choices[0].message.content
            });
        }
        return results;
    }

    async generateSuggestions(analysisResults) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为项目执行顾问，请基于详细分析提供具体的执行建议。建议应包含：
1. 优先级排序策略
2. 资源分配建议
3. 风险管理计划
4. 质量保证措施
5. 进度控制方法`
                },
                {
                    role: "user",
                    content: `基于以下分析结果：${JSON.stringify(analysisResults)}\n
请提供：
1. 任务执行的最优顺序
2. 关键路径分析
3. 具体的时间节点建议
4. 质量控制检查点
5. 应急预案建议`
                }
            ]
        });
        return response.choices[0].message.content;
    }

    async validateResults(data) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为质量控制专家，请对整体方案进行全面验证。验证应关注：
1. 完整性：是否覆盖所有必要环节
2. 一致性：各部分之间是否协调
3. 可行性：方案是否切实可行
4. 风险控制：是否有效规避风险
5. 效率优化：是否达到最优效果`
                },
                {
                    role: "user",
                    content: `请验证以下方案：${JSON.stringify(data)}\n
请评估：
1. 方案的完整性和合理性
2. 资源分配是否合理
3. 时间安排是否可行
4. 风险控制是否充分
5. 提出改进建议`
                }
            ]
        });
        return [{
            type: 'validation',
            message: response.choices[0].message.content
        }];
    }

    updateStatus(message, type) {
        const statusContainer = document.getElementById('status');
        if (!statusContainer) {
            console.warn('Status container not found');
            return;
        }

        let icon = '';
        switch (type) {
            case 'processing':
                icon = '<i class="mdi mdi-loading mdi-spin"></i>';
                break;
            case 'success':
                icon = '<i class="mdi mdi-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="mdi mdi-alert-circle"></i>';
                break;
        }

        statusContainer.innerHTML = `${icon}${message}`;
        statusContainer.className = `status-container ${type}`;
    }

    async callDeepseekAPI(params, retryCount = 0) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: params.messages,
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: false,
                    top_p: 0.95,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                throw new Error(`API 请求失败: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, retryCount);
                console.log(`API 调用失败，等待 ${delay}ms 后进行第 ${retryCount + 1} 次重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.callDeepseekAPI(params, retryCount + 1);
            }
            throw new Error(`API 调用失败（已重试 ${retryCount} 次）: ${error.message}`);
        }
    }

    parseSubtasks(response) {
        try {
            if (!response.choices || !response.choices[0]?.message?.content) {
                throw new Error('API 响应格式不正确');
            }

            const content = response.choices[0].message.content;
            try {
                const jsonData = JSON.parse(content);
                return Array.isArray(jsonData) ? jsonData : [jsonData];
            } catch {
                return content
                    .split('\n')
                    .filter(task => task.trim())
                    .map(task => ({
                        title: task.replace(/^\d+\.\s*/, '').split('：')[0],
                        description: task,
                        complexity: 1
                    }));
            }
        } catch (error) {
            console.error('解析响应时出错:', error);
            return [];
        }
    }

    parseFeedback(validation) {
        // 解析验证结果
        return {
            type: validation.confidence > 0.8 ? 'success' : 'warning',
            message: validation.feedback
        };
    }

    displaySubtasks(subtasks) {
        const subtasksPane = document.getElementById('subtasks');
        subtasksPane.innerHTML = subtasks.map(task => `
            <div class="subtask-item">
                <h3>${task.title || '子任务'}</h3>
                <div class="subtask-details">
                    <p class="description">${task.description || task}</p>
                    ${task.complexity ? `<p class="complexity">复杂度: ${task.complexity}</p>` : ''}
                    ${task.dependencies ? `<p class="dependencies">依赖: ${task.dependencies}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    displayFeedback(feedback) {
        if (!this.feedbackContainer) {
            console.warn('Feedback container not found');
            return;
        }
        
        try {
            const feedbackContent = Array.isArray(feedback) ? feedback : [feedback];
            this.feedbackContainer.innerHTML = `
                <div class="feedback-header">
                    <h3><i class="mdi mdi-comment-text"></i>分析反馈</h3>
                </div>
                <div class="feedback-content">
                    ${feedbackContent.map(item => `
                        <div class="feedback-item ${item.type || 'info'}">
                            <div class="feedback-icon">
                                <i class="mdi ${this.getFeedbackIcon(item.type)}"></i>
                            </div>
                            <div class="feedback-message">${item.message}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('显示反馈时出错:', error);
            this.feedbackContainer.innerHTML = '<div class="error-message">处理反馈时出错</div>';
        }
    }

    getFeedbackIcon(type) {
        switch (type) {
            case 'success':
                return 'mdi-check-circle';
            case 'warning':
                return 'mdi-alert';
            case 'error':
                return 'mdi-alert-circle';
            default:
                return 'mdi-information';
        }
    }

    displayAnalysis(analysisResults) {
        this.analysisContainer.innerHTML = analysisResults
            .map(result => `
                <div class="analysis-item">
                    <h3>${result.subtask}</h3>
                    <div class="analysis-content">
                        ${result.analysis}
                    </div>
                </div>
            `).join('');
    }

    displaySuggestions(suggestions) {
        if (!this.suggestionsContainer) {
            console.warn('Suggestions container not found');
            return;
        }
        
        try {
            this.suggestionsContainer.innerHTML = `
                <div class="suggestions-header">
                    <h3><i class="mdi mdi-lightbulb"></i>执行建议</h3>
                </div>
                <div class="suggestions-content">
                    ${this.formatSuggestionsContent(suggestions)}
                </div>
            `;
        } catch (error) {
            console.error('显示建议时出错:', error);
            this.suggestionsContainer.innerHTML = '<div class="error-message">处理建议时出错</div>';
        }
    }

    formatSuggestionsContent(suggestions) {
        if (typeof suggestions === 'string') {
            return suggestions.split('\n').map(line => `<p>${line}</p>`).join('');
        }
        return JSON.stringify(suggestions, null, 2);
    }

    createMindMap(mainTask, subtasks) {
        // 保存当前子任务列表以供后续使用
        this.currentSubtasks = subtasks;
        
        // 获取 CSS 变量值
        const style = getComputedStyle(document.documentElement);
        const primaryColor = style.getPropertyValue('--primary-color').trim();
        const secondaryColor = style.getPropertyValue('--secondary-color').trim();
        const warningColor = style.getPropertyValue('--warning-color').trim();
        
        // 创建主任务节点
        const nodes = [{
            id: 1,
            label: this.formatNodeLabel({
                title: '主任务',
                description: mainTask
            }),
            level: 0,
            group: 'main-task',
            font: { 
                size: 16, 
                color: '#ffffff',
                multi: true  // 启用富文本支持
            },
            margin: 12,
            shape: 'box',
            borderWidth: 2,
            color: {
                background: primaryColor,
                border: secondaryColor
            }
        }];
        
        const edges = [];
        let nodeId = 2;
        
        // 对子任务进行分类和排序
        const groupedTasks = this.groupAndSortTasks(subtasks);
        
        // 添加子任务节点
        Object.entries(groupedTasks).forEach(([group, tasks], groupIndex) => {
            // 添加分组节点
            const groupNodeId = `group_${groupIndex}`;
            nodes.push({
                id: groupNodeId,
                label: group,
                level: 1,
                group: 'group',
                collapsed: false,
                font: { 
                    size: 14, 
                    color: '#666666',
                    bold: true
                },
                shape: 'box',
                color: {
                    background: '#f5f5f5',
                    border: '#dddddd',
                    highlight: {
                        background: '#e8e8e8',
                        border: '#cccccc'
                    }
                },
                margin: 12,
                icon: {
                    face: 'Material Design Icons',
                    code: '\uf0140',  // 展开图标
                    size: 24,
                    color: '#666666'
                }
            });
            
            // 连接主任务到分组
            edges.push({
                from: 1,
                to: groupNodeId,
                arrows: 'to',
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                },
                color: '#999999',
                width: 1
            });
            
            // 添加该分组下的子任务
            tasks.forEach((task, index) => {
                const taskNodeId = nodeId++;
                const isCritical = this.isTaskCritical(task);
                
                nodes.push({
                    id: taskNodeId,
                    label: this.formatTaskNode(task),
                    level: 2,
                    group: isCritical ? 'critical' : 'subtask',
                    font: {
                        size: 13,
                        color: isCritical ? '#f57c00' : '#333333',
                        multi: true,  // 启用富文本支持
                        face: 'arial'
                    },
                    margin: {
                        top: 10,
                        bottom: 10,
                        left: 15,
                        right: 15
                    },
                    shape: 'box',
                    widthConstraint: {
                        minimum: 200,
                        maximum: 300
                    },
                    color: {
                        background: isCritical ? 'rgba(255, 152, 0, 0.1)' : '#ffffff',
                        border: isCritical ? warningColor : '#999999'
                    }
                });
                
                // 连接分组到子任务
                edges.push({
                    from: groupNodeId,
                    to: taskNodeId,
                    arrows: 'to',
                    smooth: {
                        type: 'curvedCW',
                        roundness: 0.2
                    },
                    color: isCritical ? warningColor : '#999999',
                    width: isCritical ? 2 : 1
                });
                
                // 添加任务依赖关系
                if (task.dependencies) {
                    task.dependencies.forEach(depId => {
                        edges.push({
                            from: depId,
                            to: taskNodeId,
                            arrows: 'to',
                            dashes: true,
                            color: '#666666',
                            width: 1,
                            smooth: {
                                type: 'curvedCW',
                                roundness: 0.2
                            }
                        });
                    });
                }
            });
        });

        const container = document.getElementById('mindmap');
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        const options = {
            layout: {
                hierarchical: {
                    direction: 'UD',
                    sortMethod: 'directed',
                    levelSeparation: 120,
                    nodeSpacing: 180,
                    treeSpacing: 200
                }
            },
            nodes: {
                shape: 'box',
                margin: 10,
                borderWidth: 1,
                shadow: true,
                font: {
                    multi: true  // 启用富文本支持
                },
                chosen: {
                    node: (values, id, selected, hovering) => {
                        if (hovering) {
                            values.shadow = true;
                            values.borderWidth = 2;
                        }
                    }
                }
            },
            edges: {
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'vertical'
                }
            },
            physics: {
                enabled: true,
                hierarchicalRepulsion: {
                    nodeDistance: 250  // 增加节点间距
                },
                stabilization: {
                    iterations: 100
                }
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                zoomView: true,
                hover: true,
                tooltipDelay: 300
            },
            manipulation: {
                enabled: true,
                addNode: false,
                addEdge: false,
                editNode: (nodeData, callback) => {
                    this.editNodeDetails(nodeData, callback);
                },
                deleteNode: false,
                deleteEdge: false
            }
        };

        // 创建网络图实例
        const network = new vis.Network(container, data, options);
        
        // 添加事件监听
        this.addNetworkEventListeners(network, data);
        
        // 初始化控制按钮
        this.initMindMapControls(network);
        
        // 在 createMindMap 方法中添加布局优化
        this.optimizeLayout(network, nodes, edges);
        
        return network;
    }

    // 对任务进行分组和排序
    groupAndSortTasks(tasks) {
        const groups = {};
        
        tasks.forEach(task => {
            const group = this.determineTaskGroup(task);
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(task);
        });
        
        // 对每个组内的任务进行排序
        Object.keys(groups).forEach(group => {
            groups[group].sort((a, b) => {
                // 首先按优先级排序
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                // 然后按复杂度排序
                if (a.complexity !== b.complexity) {
                    return b.complexity - a.complexity;
                }
                // 最后按名称排序
                return a.title.localeCompare(b.title);
            });
        });
        
        return groups;
    }

    // 确定任务所属分组
    determineTaskGroup(task) {
        if (task.group) return task.group;
        
        // 基于任务特征自动分组
        if (task.type === 'preparation' || task.title.includes('准备')) {
            return '准备阶段';
        }
        if (task.type === 'development' || task.title.includes('开发')) {
            return '开发阶段';
        }
        if (task.type === 'testing' || task.title.includes('测试')) {
            return '测试阶段';
        }
        if (task.type === 'deployment' || task.title.includes('部署')) {
            return '部署阶段';
        }
        
        return '其他任务';
    }

    // 判断任务是否为关键任务
    isTaskCritical(task) {
        return (
            task.complexity >= 4 || 
            task.priority >= 4 || 
            task.isKeyPath || 
            (task.risks && task.risks.some(risk => risk.level === 'high'))
        );
    }

    // 格式化任务节点显示内容
    formatTaskNode(task) {
        if (typeof task === 'string') {
            return task;
        }

        // 构建纯文本格式的节点标签
        let label = '';
        
        // 添加标题
        label += `${task.title || '未命名任务'}`;
        
        // 添加描述（如果存在）
        if (task.description) {
            const shortDesc = this.truncateText(task.description, 50);
            label += `\n${shortDesc}`;
        }
        
        // 添加关键信息
        const details = [];
        if (task.complexity) {
            details.push(`复杂度:${task.complexity}`);
        }
        if (task.duration) {
            details.push(`时长:${task.duration}`);
        }
        if (task.priority) {
            details.push(`优先级:P${task.priority}`);
        }
        
        // 添加任务状态（如果有）
        const taskProgress = this.taskProgress?.get(task.id);
        if (taskProgress) {
            details.push(`进度:${taskProgress.progress}%`);
        }
        
        // 添加详细信息
        if (details.length > 0) {
            label += `\n${details.join(' | ')}`;
        }
        
        return label;
    }

    // 添加辅助方法
    getComplexityStars(complexity) {
        const filled = '★'.repeat(complexity);
        const empty = '☆'.repeat(5 - complexity);
        return `<span class="complexity-stars">${filled}${empty}</span>`;
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // 添加网络图件监听器
    addNetworkEventListeners(network, data) {
        // 节点悬停效果
        network.on('hoverNode', (params) => {
            const node = data.nodes.get(params.node);
            if (node.group !== 'group') {
                network.canvas.body.container.style.cursor = 'pointer';
                
                // 显示工具提示
                this.showNodeTooltip(node, params.event);
            }
        });

        network.on('blurNode', () => {
            network.canvas.body.container.style.cursor = 'default';
            this.hideNodeTooltip();
        });

        // 节点点击效果
        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = data.nodes.get(nodeId);
                
                if (node.group !== 'group') {
                    this.showNodeDetails(node);
                }
            }
        });

        // 节点双击效果
        network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = data.nodes.get(nodeId);
                
                if (node.group === 'group') {
                    this.toggleGroupNodes(network, data, nodeId);
                } else {
                    this.editNodeDetails(node, (updatedNode) => {
                        data.nodes.update(updatedNode);
                    });
                }
            }
        });

        // 添加拖拽完成事件
        network.on('dragEnd', (params) => {
            if (params.nodes.length > 0) {
                this.saveNodePositions(network);
            }
        });
    }

    // 显示节点工具提示
    showNodeTooltip(node, event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'node-tooltip';
        
        const task = this.findTaskByNodeId(node.id);
        if (!task) return;

        tooltip.innerHTML = `
            <div class="tooltip-content">
                <h4>${task.title}</h4>
                ${task.description ? `<p>${task.description}</p>` : ''}
                <div class="tooltip-details">
                    ${task.complexity ? `<div>复杂度: ${this.getComplexityStars(task.complexity)}</div>` : ''}
                    ${task.duration ? `<div>预计时长: ${task.duration}</div>` : ''}
                    ${task.priority ? `<div>优先级: P${task.priority}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(tooltip);

        // 定位工具提示
        const x = event.clientX + 10;
        const y = event.clientY + 10;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    hideNodeTooltip() {
        const tooltip = document.querySelector('.node-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // 保存节点位置
    saveNodePositions(network) {
        const positions = network.getPositions();
        localStorage.setItem('nodePositions', JSON.stringify(positions));
    }

    // 恢复节点位置
    restoreNodePositions(network) {
        const savedPositions = localStorage.getItem('nodePositions');
        if (savedPositions) {
            const positions = JSON.parse(savedPositions);
            Object.entries(positions).forEach(([nodeId, position]) => {
                network.moveNode(nodeId, position.x, position.y);
            });
        }
    }

    // 显示节点详细信息
    showNodeDetails(node) {
        if (node.group === 'group') return;
        
        const task = this.findTaskByNodeId(node.id);
        if (!task) return;
        
        const detailsHTML = `
            <div class="task-details-popup">
                <div class="task-details-header">
                    <h3>${task.title}</h3>
                    ${task.priority ? `<span class="priority-badge">P${task.priority}</span>` : ''}
                </div>
                <div class="task-details-content">
                    <div class="detail-item">
                        <label>描述</label>
                        <p>${task.description || '无描述'}</p>
                    </div>
                    ${task.complexity ? `
                        <div class="detail-item">
                            <label>复杂度</label>
                            <div class="complexity-indicator">
                                ${this.createComplexityIndicator(task.complexity)}
                            </div>
                        </div>
                    ` : ''}
                    ${task.duration ? `
                        <div class="detail-item">
                            <label>预计时长</label>
                            <p>${task.duration}</p>
                        </div>
                    ` : ''}
                    ${task.dependencies ? `
                        <div class="detail-item">
                            <label>依赖任务</label>
                            <p>${this.formatDependencies(task.dependencies)}</p>
                        </div>
                    ` : ''}
                    ${task.risks ? `
                        <div class="detail-item">
                            <label>风险因素</label>
                            <ul class="risks-list">
                                ${task.risks.map(risk => `
                                    <li class="risk-item ${risk.level}">
                                        <span class="risk-level">${risk.level}</span>
                                        <span class="risk-desc">${risk.description}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // 使用自定义弹窗组件显示详情
        this.showPopup(detailsHTML);
    }

    // 格式化节点标签
    formatNodeLabel(task) {
        const maxTitleLength = 30;
        const maxDescLength = 50;
        
        let label = '';
        
        // 格式化标题
        if (task.title) {
            const title = task.title.length > maxTitleLength 
                ? task.title.substring(0, maxTitleLength) + '...'
                : task.title;
            label += title;
        }
        
        // 格式化描述
        if (task.description) {
            const description = task.description.length > maxDescLength 
                ? task.description.substring(0, maxDescLength) + '...'
                : task.description;
            label += `\n${description}`;
        }
        
        return label;
    }

    // 初始化思维导图控制按钮
    initMindMapControls(network) {
        const controls = document.querySelector('.mindmap-controls');
        controls.innerHTML = `
            <div class="control-group">
                <input type="text" class="search-input" placeholder="搜索任务...">
                <select class="filter-select">
                    <option value="all">全部任务</option>
                    <option value="high-priority">高优先级</option>
                    <option value="complex">高复杂度</option>
                    <option value="in-progress">进行中</option>
                    <option value="completed">已完成</option>
                </select>
            </div>
            <div class="control-group">
                <button title="放大" class="icon-btn"><i class="mdi mdi-plus"></i></button>
                <button title="缩小" class="icon-btn"><i class="mdi mdi-minus"></i></button>
                <button title="适应屏幕" class="icon-btn"><i class="mdi mdi-fit-to-screen"></i></button>
                <button title="导出图片" class="icon-btn"><i class="mdi mdi-export"></i></button>
            </div>
        `;

        // 初始化搜索和过滤功能
        this.initSearchAndFilter();
        
        // 放大按钮
        controls.querySelector('[title="放大"]').addEventListener('click', () => {
            network.zoomIn();
        });
        
        // 缩小按钮
        controls.querySelector('[title="缩小"]').addEventListener('click', () => {
            network.zoomOut();
        });
        
        // 适应屏幕按钮
        controls.querySelector('[title="适应屏幕"]').addEventListener('click', () => {
            network.fit();
        });
        
        // 导出图片按钮
        controls.querySelector('[title="导出图片"]').addEventListener('click', () => {
            const canvas = document.querySelector('.vis-network canvas');
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = '任务分解图.png';
            link.href = image;
            link.click();
        });
    }

    displayTaskAnalysis(analysis) {
        const taskAnalysisPane = document.getElementById('task-analysis');
        taskAnalysisPane.innerHTML = `
            <div class="analysis-section">
                <h3>任务分析结果</h3>
                <div class="analysis-content">
                    ${this.formatAnalysisContent(analysis)}
                </div>
            </div>
        `;
    }

    displayResources(resources) {
        const resourcesPane = document.getElementById('resources');
        resourcesPane.innerHTML = `
            <div class="resources-section">
                <h3>资源需求分析</h3>
                <div class="resources-content">
                    ${this.formatResourcesContent(resources)}
                </div>
            </div>
        `;
    }

    displayRisks(risks) {
        const risksPane = document.getElementById('risks');
        risksPane.innerHTML = `
            <div class="risks-section">
                <h3>风险评估</h3>
                <div class="risks-content">
                    ${this.formatRisksContent(risks)}
                </div>
            </div>
        `;
    }

    displayTimeline(timeline) {
        const timelinePane = document.getElementById('timeline');
        timelinePane.innerHTML = `
            <div class="timeline-section">
                <h3>时间线规划</h3>
                <div class="timeline-content">
                    ${this.formatTimelineContent(timeline)}
                </div>
            </div>
        `;
    }

    formatAnalysisContent(analysis) {
        try {
            // 尝试检测是否是JSON格式
            const content = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
            return content.replace(/\n/g, '<br>');
        } catch (error) {
            return String(analysis).replace(/\n/g, '<br>');
        }
    }

    formatResourcesContent(resources) {
        if (!resources) return '暂无资源需求数据';
        try {
            if (typeof resources === 'string') {
                return resources.replace(/\n/g, '<br>');
            }
            return Object.entries(resources)
                .map(([resource, details]) => `
                    <div class="resource-item">
                        <h4>${resource}</h4>
                        <p>${details}</p>
                    </div>
                `).join('');
        } catch (error) {
            return String(resources).replace(/\n/g, '<br>');
        }
    }

    formatRisksContent(risks) {
        if (!risks) return '暂无风险评估数据';
        try {
            if (typeof risks === 'string') {
                return risks.replace(/\n/g, '<br>');
            }
            return Array.isArray(risks) ? risks.map(risk => `
                <div class="risk-item">
                    <h4>${risk.title || '风险项'}</h4>
                    <p>${risk.description || risk}</p>
                    ${risk.mitigation ? `<p class="mitigation">缓解措施: ${risk.mitigation}</p>` : ''}
                </div>
            `).join('') : String(risks).replace(/\n/g, '<br>');
        } catch (error) {
            return String(risks).replace(/\n/g, '<br>');
        }
    }

    formatTimelineContent(timeline) {
        if (!timeline) return '暂无时间线数据';
        try {
            if (typeof timeline === 'string') {
                return timeline.replace(/\n/g, '<br>');
            }
            return Array.isArray(timeline) ? timeline.map(item => `
                <div class="timeline-item">
                    <div class="timeline-date">${item.date || item.time || ''}</div>
                    <div class="timeline-content">
                        <h4>${item.title || '任务项'}</h4>
                        <p>${item.description || item}</p>
                    </div>
                </div>
            `).join('') : String(timeline).replace(/\n/g, '<br>');
        } catch (error) {
            return String(timeline).replace(/\n/g, '<br>');
        }
    }

    async analyzeResources(subtasks) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为资源规划专家，请分析完成任务所需的各类资源。分析维度包括：
1. 人力资源需求
2. 技术资源需求
3. 物料资源需求
4. 时间资源分配
5. 预算资源评估
请确保分析全面且具体。`
                },
                {
                    role: "user",
                    content: `请分析完成以下子任务所需的具体资源：
${JSON.stringify(subtasks, null, 2)}

请提供：
1. 每个子任务的具体资源需求清单
2. 资源使用的时间安排
3. 资源间的依赖关系
4. 资源获取的难度评估
5. 资源成本估算`
                }
            ]
        });

        if (!response.choices || !response.choices[0]?.message?.content) {
            throw new Error('资源分析响应格式不正确');
        }

        return response.choices[0].message.content;
    }

    async analyzeRisks(context, subtasks) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为风险管理专家，请对任务执行过程中的潜在风险进行全面分析。分析维度包括：
1. 技术风险
2. 进度风险
3. 资源风险
4. 质量风险
5. 外部依赖风险
请对每个风险提供具体的应对策略。`
                },
                {
                    role: "user",
                    content: `请基于以下信息进行风险分析：
任务上下文：${JSON.stringify(context, null, 2)}
子任务列表：${JSON.stringify(subtasks, null, 2)}

请提供：
1. 每个子任务的具体风险点
2. 风险发生的可能性评估（低/中/高）
3. 风险影响的严重程度评估
4. 具体的预防措施
5. 应急响应方案`
                }
            ]
        });

        if (!response.choices || !response.choices[0]?.message?.content) {
            throw new Error('风险分析响应格式不正确');
        }

        return response.choices[0].message.content;
    }

    async createTimeline(subtasks, timeConstraint) {
        const response = await this.callDeepseekAPI({
            messages: [
                {
                    role: "system",
                    content: `作为项目规划专家，请基于子任务和时间约束制定详细的时间线。规划应考虑：
1. 任务优先级
2. 任务依赖关系
3. 资源可用性
4. 风险缓冲时间
5. 关键路径分析`
                },
                {
                    role: "user",
                    content: `请基于以下信息制定时间线：
子任务列表：${JSON.stringify(subtasks, null, 2)}
时间约束：${timeConstraint}

请提供：
1. 详细的时间节点安排
2. 每个子任务的开始和结束时间
3. 关键里程碑
4. 并行任务的协调方案
5. 时间缓冲的分配建议`
                }
            ]
        });

        if (!response.choices || !response.choices[0]?.message?.content) {
            throw new Error('时间线规划响应格式不正确');
        }

        return response.choices[0].message.content;
    }

    // 模板管理
    handleTemplates() {
        const templateSelect = document.querySelector('.template-selection select');
        templateSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadTemplate(e.target.value);
            }
        });
    }

    loadTemplate(templateId) {
        const templates = {
            // 技术开发模板
            agile: {
                domain: 'tech',
                complexity: 'medium',
                timeConstraint: '2周',
                description: '采用敏捷开发方法论的项目模板，包含Sprint规划、每日��会、回顾会议等环节。',
                constraints: '遵循Scrum框架，每个Sprint为2周，需要团队全员参与。'
            },
            waterfall: {
                domain: 'tech',
                complexity: 'complex',
                timeConstraint: '3个月',
                description: '传统瀑布开发模型，包含需求分析、设计、开发、测试、部署等阶段。',
                constraints: '需要详细的文档记录，每个阶段都需要评审通过。'
            },
            microservice: {
                domain: 'tech',
                complexity: 'complex',
                timeConstraint: '6个月',
                description: '微服务架构设计和实现，包含服务拆分、���口设���、部署架构等。',
                constraints: '需要考虑服务间通信、数据一致性、容错性等问题。'
            },
            mobile: {
                domain: 'tech',
                complexity: 'medium',
                timeConstraint: '3个月',
                description: '移动应用开发项目，包含UI设计、功能开发、性能优化等。',
                constraints: '需要适配不同设备和系统版本，注重用户体验。'
            },
            
            // 项目管理模板
            research: {
                domain: 'research',
                complexity: 'complex',
                timeConstraint: '6个月',
                description: '研究项目规划，包含文献调研、方案设计、实验验证、结果分析等。',
                constraints: '需要严格的实验方法，定期进行成果评估。'
            },
            product: {
                domain: 'business',
                complexity: 'medium',
                timeConstraint: '4个月',
                description: '产品开发流程，包含市场调研、需求分析、原型设计、开发测试等。',
                constraints: '需要与市场和用户保持密切沟通，注重产品体验。'
            },
            integration: {
                domain: 'tech',
                complexity: 'complex',
                timeConstraint: '3个月',
                description: '系统集成项目，包含现状评估、方案设计、系统对接、测试验收等。',
                constraints: '需要考虑系统兼容性，确保数据安全。'
            },
            
            // 业务运营模板
            marketing: {
                domain: 'business',
                complexity: 'medium',
                timeConstraint: '1个月',
                description: '营销活动策划，包含目标设定、方案制定、资源协调、效果评估等。',
                constraints: '需要控制预算，注重ROI，保证活动效果。'
            },
            event: {
                domain: 'business',
                complexity: 'medium',
                timeConstraint: '2周',
                description: '活动策划执行，包含前期筹备、现场管理、后期总结等。',
                constraints: '需要详细的应急预案，确保活动顺利进行。'
            },
            operation: {
                domain: 'business',
                complexity: 'medium',
                timeConstraint: '3个月',
                description: '运营体系优化，包含现状分析、方案制定、流程优化、效果追踪等。',
                constraints: '需要各部门配合，注重实施过程中的反馈。'
            },
            
            // 数据分析模板
            dataAnalysis: {
                domain: 'research',
                complexity: 'complex',
                timeConstraint: '1个月',
                description: '数据分析项目，包含数据收集、清洗、分析、可视化、��告等��',
                constraints: '需要确保数据质量，使用科学的分析方法。'
            },
            marketResearch: {
                domain: 'business',
                complexity: 'medium',
                timeConstraint: '2个月',
                description: '市场调研项目，包含调研设计、数据采集、分析报告等。',
                constraints: '需要保证样本代表性，控制调研成本。'
            },
            userResearch: {
                domain: 'research',
                complexity: 'medium',
                timeConstraint: '1个月',
                description: '用户研究项目，包含用户访谈、行为分析、需求提炼等。',
                constraints: '需要覆盖不同用户群体，注重研究方法的科学性。'
            }
        };

        const template = templates[templateId];
        if (template) {
            document.getElementById('domainSelect').value = template.domain;
            document.getElementById('complexityLevel').value = template.complexity;
            document.getElementById('timeConstraint').value = template.timeConstraint;
            document.getElementById('mainTask').value = template.description;
            document.getElementById('constraints').value = template.constraints;
            
            // 触发模板载事件
            this.onTemplateLoaded(templateId, template);
        }
    }

    // 添加模板加载后的回调
    onTemplateLoaded(templateId, template) {
        // 更新状态显示
        this.updateStatus(`已加载"${document.querySelector(`option[value="${templateId}"]`).textContent}"模板`, 'success');
        
        // 可以在这里添加额外的模板相关逻辑
        console.log(`模板 ${templateId} 已加载:`, template);
    }

    // 协作功能
    initCollaboration() {
        const commentInput = document.querySelector('.comment-input textarea');
        const sendButton = document.querySelector('.comment-input .btn-primary');

        sendButton.addEventListener('click', () => {
            const comment = commentInput.value.trim();
            if (comment) {
                this.addComment(comment);
                commentInput.value = '';
            }
        });
    }

    addComment(content) {
        const commentsList = document.querySelector('.comments-list');
        const commentHTML = `
            <div class="comment">
                <div class="comment-header">
                    <img src="https://via.placeholder.com/24" alt="User">
                    <span class="comment-author">当前用户</span>
                    <span class="comment-time">刚刚</span>
                </div>
                <div class="comment-content">
                    ${content}
                </div>
            </div>
        `;
        commentsList.insertAdjacentHTML('afterbegin', commentHTML);
    }

    // 导出功能
    initExport() {
        const exportBtn = document.querySelector('.action-buttons .icon-btn[title="导出报告"]');
        exportBtn.addEventListener('click', () => {
            this.exportReport();
        });
    }

    exportReport() {
        // 收集所有分析结果
        const report = {
            taskAnalysis: document.getElementById('task-analysis').innerHTML,
            subtasks: document.getElementById('subtasks').innerHTML,
            resources: document.getElementById('resources').innerHTML,
            risks: document.getElementById('risks').innerHTML,
            timeline: document.getElementById('timeline').innerHTML
        };

        // 创建导出文件
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '任务分析报告.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    checkFontLoading() {
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                document.documentElement.classList.add('font-loaded');
            });
        } else {
            // 降级方案：简单延时
            setTimeout(() => {
                document.documentElement.classList.add('font-loaded');
            }, 300);
        }
    }

    // 添加节点编辑方法
    editNodeDetails(nodeData, callback) {
        if (nodeData.group === 'group') {
            callback(nodeData);
            return;
        }

        const task = this.findTaskByNodeId(nodeData.id);
        if (!task) {
            callback(nodeData);
            return;
        }

        const editForm = `
            <div class="edit-task-form">
                <div class="form-group">
                    <label>标题</label>
                    <input type="text" class="task-title" value="${task.title || ''}" />
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="task-description">${task.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>复杂度</label>
                    <select class="task-complexity">
                        ${[1,2,3,4,5].map(n => `
                            <option value="${n}" ${task.complexity === n ? 'selected' : ''}>
                                ${n} - ${this.getComplexityLabel(n)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select class="task-priority">
                        ${[1,2,3,4,5].map(n => `
                            <option value="${n}" ${task.priority === n ? 'selected' : ''}>
                                P${n}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>预计时长</label>
                    <input type="text" class="task-duration" value="${task.duration || ''}" />
                </div>
                <div class="form-group">
                    <label>依赖任务</label>
                    <select class="task-dependencies" multiple>
                        ${this.currentSubtasks
                            .filter(t => t.id !== task.id)
                            .map(t => `
                                <option value="${t.id}" ${
                                    task.dependencies?.includes(t.id) ? 'selected' : ''
                                }>
                                    ${t.title}
                                </option>
                            `).join('')}
                    </select>
                </div>
            </div>
        `;

        this.showPopup(editForm, async (popup) => {
            const formData = {
                title: popup.querySelector('.task-title').value,
                description: popup.querySelector('.task-description').value,
                complexity: parseInt(popup.querySelector('.task-complexity').value),
                priority: parseInt(popup.querySelector('.task-priority').value),
                duration: popup.querySelector('.task-duration').value,
                dependencies: Array.from(
                    popup.querySelector('.task-dependencies').selectedOptions,
                    option => option.value
                )
            };

            // 更新任务数据
            Object.assign(task, formData);
            
            // 更新节点显示
            nodeData.label = this.formatTaskNode(task);
            callback(nodeData);
            
            // 重新分析和更新显示
            await this.updateAnalysis();
            
            // 更新思维导图中的依赖关系
            this.updateTaskDependencies(task);
        });
    }

    // 更新任务依赖关系
    updateTaskDependencies(task) {
        const edges = this.network.body.data.edges;
        
        // 删除现有的依赖边
        const existingEdges = edges.get({
            filter: edge => edge.to === task.id && edge.dashes === true
        });
        edges.remove(existingEdges);
        
        // 添加新的依赖边
        if (task.dependencies && task.dependencies.length > 0) {
            const newEdges = task.dependencies.map(depId => ({
                from: depId,
                to: task.id,
                arrows: 'to',
                dashes: true,
                color: '#666666',
                width: 1,
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.2
                }
            }));
            edges.add(newEdges);
        }
    }

    // 显示弹窗
    showPopup(content, callback) {
        const popup = document.createElement('div');
        popup.className = 'task-popup';
        popup.innerHTML = `
            <div class="popup-content">
                ${content}
                <div class="popup-actions">
                    <button class="btn btn-primary save-btn">保存</button>
                    <button class="btn btn-secondary cancel-btn">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        const saveBtn = popup.querySelector('.save-btn');
        const cancelBtn = popup.querySelector('.cancel-btn');

        saveBtn.addEventListener('click', () => {
            if (callback) {
                callback(popup);
            }
            document.body.removeChild(popup);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(popup);
        });
    }

    // 获取复杂度标签
    getComplexityLabel(level) {
        const labels = {
            1: '简单',
            2: '较简单',
            3: '中等',
            4: '复杂',
            5: '非常复杂'
        };
        return labels[level] || '未知';
    }

    // 根据节点ID查找任务
    findTaskByNodeId(nodeId) {
        if (!this.currentSubtasks) return null;
        return this.currentSubtasks.find(task => task.id === nodeId);
    }

    // 在 createMindMap 方法中添加布局优化
    optimizeLayout(network, nodes, edges) {
        const layoutOptions = {
            hierarchical: {
                direction: 'UD',
                sortMethod: 'directed',
                levelSeparation: 150,
                nodeSpacing: 200,
                treeSpacing: 200,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
            }
        };

        // 应用布局
        network.setOptions({ layout: layoutOptions });

        // 添加自动调整功能
        network.on('stabilized', () => {
            network.fit({
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
        });

        // 优化节点位置
        this.adjustNodePositions(network, nodes);
    }

    // 节点位置优化
    adjustNodePositions(network, nodes) {
        const nodePositions = network.getPositions();
        const levels = {};
        
        // 按层级分组
        nodes.forEach(node => {
            if (!levels[node.level]) {
                levels[node.level] = [];
            }
            levels[node.level].push(node);
        });

        // 优化每层节点的位置
        Object.entries(levels).forEach(([level, levelNodes]) => {
            const avgY = levelNodes.reduce((sum, node) => {
                return sum + nodePositions[node.id].y;
            }, 0) / levelNodes.length;

            // 调整同层节点的垂直位置
            levelNodes.forEach(node => {
                const pos = nodePositions[node.id];
                network.moveNode(node.id, pos.x, avgY);
            });
        });
    }

    // 添加进度跟踪相关方法
    initProgressTracking() {
        if (!this.taskProgress) {
            this.taskProgress = new Map();
        }
        
        // 初始化所有任务的进度
        if (this.currentSubtasks) {
            this.currentSubtasks.forEach(task => {
                if (!this.taskProgress.has(task.id)) {
                    this.taskProgress.set(task.id, new TaskProgress(task));
                }
            });
        }
    }

    updateTaskProgress(taskId, progress, note) {
        const taskProgress = this.taskProgress.get(taskId);
        if (taskProgress) {
            taskProgress.updateProgress(progress);
            if (note) {
                taskProgress.addNote(note);
            }
            this.updateProgressDisplay(taskId);
        }
    }

    updateProgressDisplay(taskId) {
        const taskProgress = this.taskProgress.get(taskId);
        if (!taskProgress) return;

        // 更新思维导图中的节点显示
        const node = this.network.body.data.nodes.get(taskId);
        if (node) {
            node.color = this.getProgressColor(taskProgress.progress);
            this.network.body.data.nodes.update(node);
        }

        // 更新任务列表中的进度显示
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            const progressBar = taskElement.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${taskProgress.progress}%`;
                progressBar.setAttribute('aria-valuenow', taskProgress.progress);
            }
        }
    }

    getProgressColor(progress) {
        if (progress === 100) {
            return { background: '#4caf50', border: '#388e3c' };
        } else if (progress > 0) {
            return { background: '#2196f3', border: '#1976d2' };
        }
        return { background: '#ffffff', border: '#999999' };
    }

    // 添加数据持久化方法
    saveProjectData() {
        try {
            const projectData = {
                mainTask: document.getElementById('mainTask')?.value || '',
                constraints: document.getElementById('constraints')?.value || '',
                domain: document.getElementById('domainSelect')?.value || '',
                complexity: document.getElementById('complexityLevel')?.value || '',
                timeConstraint: document.getElementById('timeConstraint')?.value || '',
                subtasks: this.currentSubtasks || [],
                progress: this.taskProgress ? Array.from(this.taskProgress.entries()) : [],
                lastModified: new Date()
            };

            localStorage.setItem('taskDecomposerProject', JSON.stringify(projectData));
        } catch (error) {
            console.error('保存项目数据失败:', error);
        }
    }

    loadProjectData() {
        const savedData = localStorage.getItem('taskDecomposerProject');
        if (savedData) {
            try {
                const projectData = JSON.parse(savedData);
                
                // 恢复表单数据
                if (document.getElementById('mainTask')) {
                    document.getElementById('mainTask').value = projectData.mainTask || '';
                    document.getElementById('constraints').value = projectData.constraints || '';
                    document.getElementById('domainSelect').value = projectData.domain || '';
                    document.getElementById('complexityLevel').value = projectData.complexity || '';
                    document.getElementById('timeConstraint').value = projectData.timeConstraint || '';
                }

                // 恢复任务数据
                this.currentSubtasks = projectData.subtasks || [];
                
                // 恢复进度数据
                this.taskProgress = new Map(projectData.progress || []);

                // 确保所有当前任务都有进度记录
                if (this.currentSubtasks) {
                    this.currentSubtasks.forEach(task => {
                        if (!this.taskProgress.has(task.id)) {
                            this.taskProgress.set(task.id, new TaskProgress(task));
                        }
                    });
                }

                // 重新创建可视化
                if (this.currentSubtasks && this.currentSubtasks.length > 0) {
                    this.handleDecomposition();
                }

                return true;
            } catch (error) {
                console.error('加载项目数据失败:', error);
                // 如果加载失败，确保初���化一个空的 Map
                this.taskProgress = new Map();
                return false;
            }
        }
        // 如果没有保存的数据，初始化一个空的 Map
        this.taskProgress = new Map();
        return false;
    }

    // 添加析构方法
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.saveProjectData(); // 最后保存一次
    }

    toggleGroupNodes(network, data, groupId) {
        const group = data.nodes.get(groupId);
        const connectedNodes = network.getConnectedNodes(groupId);
        
        // 切换分组的展开/折叠状态
        group.collapsed = !group.collapsed;
        
        // 更新分组节点的样式
        group.icon = {
            face: 'Material Design Icons',
            code: group.collapsed ? '\uf0142' : '\uf0140',  // 使用 MDI 图标
            size: 24,
            color: '#666666'
        };
        
        // 更新连接的节点的可见性
        connectedNodes.forEach(nodeId => {
            const node = data.nodes.get(nodeId);
            if (node.group !== 'group') {
                node.hidden = group.collapsed;
                data.nodes.update(node);
            }
        });
        
        data.nodes.update(group);
    }

    initDragAndDrop(network, data) {
        let dragStartNode = null;
        let dragEndNode = null;

        network.on('dragStart', params => {
            if (params.nodes.length === 1) {
                dragStartNode = params.nodes[0];
            }
        });

        network.on('dragEnd', params => {
            if (params.nodes.length === 1) {
                dragEndNode = params.nodes[0];
                if (dragStartNode && dragEndNode && dragStartNode !== dragEndNode) {
                    this.handleNodeReorder(network, data, dragStartNode, dragEndNode);
                }
            }
            dragStartNode = null;
            dragEndNode = null;
        });
    }

    handleNodeReorder(network, data, fromId, toId) {
        const fromNode = data.nodes.get(fromId);
        const toNode = data.nodes.get(toId);
        
        if (fromNode.group === 'group' || toNode.group === 'group') {
            return; // 不允许移动分组节点
        }

        // 获取节点的当前位置
        const positions = network.getPositions([fromId, toId]);
        const fromPos = positions[fromId];
        const toPos = positions[toId];

        // 更新节点顺序
        const fromTask = this.findTaskByNodeId(fromId);
        const toTask = this.findTaskByNodeId(toId);
        
        if (fromTask && toTask) {
            // 更新任务顺序
            const fromIndex = this.currentSubtasks.indexOf(fromTask);
            const toIndex = this.currentSubtasks.indexOf(toTask);
            
            this.currentSubtasks.splice(fromIndex, 1);
            this.currentSubtasks.splice(toIndex, 0, fromTask);
            
            // 重新创建思维导图
            this.createMindMap(document.getElementById('mainTask').value, this.currentSubtasks);
        }
    }

    initSearchAndFilter() {
        const searchInput = document.querySelector('.mindmap-controls .search-input');
        const filterSelect = document.querySelector('.mindmap-controls .filter-select');
        
        searchInput.addEventListener('input', (e) => {
            this.searchNodes(e.target.value);
        });
        
        filterSelect.addEventListener('change', (e) => {
            this.filterNodes(e.target.value);
        });
    }

    searchNodes(query) {
        if (!this.network || !this.currentSubtasks) return;
        
        const nodes = this.network.body.data.nodes;
        const searchQuery = query.toLowerCase();
        
        nodes.forEach(node => {
            const task = this.findTaskByNodeId(node.id);
            if (task) {
                const matchTitle = task.title.toLowerCase().includes(searchQuery);
                const matchDesc = task.description?.toLowerCase().includes(searchQuery);
                
                node.hidden = !(matchTitle || matchDesc);
                nodes.update(node);
            }
        });
    }

    filterNodes(criteria) {
        if (!this.network || !this.currentSubtasks) return;
        
        const nodes = this.network.body.data.nodes;
        
        nodes.forEach(node => {
            const task = this.findTaskByNodeId(node.id);
            if (task) {
                let show = true;
                
                switch (criteria) {
                    case 'high-priority':
                        show = task.priority >= 4;
                        break;
                    case 'complex':
                        show = task.complexity >= 4;
                        break;
                    case 'in-progress':
                        const progress = this.taskProgress.get(task.id);
                        show = progress && progress.status === 'in-progress';
                        break;
                    case 'completed':
                        const taskProgress = this.taskProgress.get(task.id);
                        show = taskProgress && taskProgress.status === 'completed';
                        break;
                    case 'all':
                    default:
                        show = true;
                }
                
                node.hidden = !show;
                nodes.update(node);
            }
        });
    }

    // 在 TaskDecomposer 类中添加
    highlightConnectedNodes(nodeId, highlight = true) {
        if (!this.network) return;
        
        const allNodes = this.network.body.nodes;
        const allEdges = this.network.body.edges;
        
        // 重置所有节点和边的样式
        Object.values(allNodes).forEach(node => {
            node.setOptions({
                opacity: highlight ? 0.3 : 1
            });
        });
        
        Object.values(allEdges).forEach(edge => {
            edge.setOptions({
                opacity: highlight ? 0.3 : 1
            });
        });
        
        if (highlight) {
            // 获取相关节点
            const connectedNodes = this.network.getConnectedNodes(nodeId);
            const connectedEdges = this.network.getConnectedEdges(nodeId);
            
            // 高亮相关节点和边
            allNodes[nodeId].setOptions({ opacity: 1 });
            connectedNodes.forEach(id => {
                allNodes[id].setOptions({ opacity: 1 });
            });
            
            connectedEdges.forEach(id => {
                allEdges[id].setOptions({ opacity: 1 });
            });
        }
        
        this.network.redraw();
    }

    focusOnNode(nodeId) {
        if (!this.network) return;
        
        const options = {
            scale: 1.2,
            offset: { x: 0, y: 0 },
            animation: {
                duration: 1000,
                easingFunction: 'easeInOutQuad'
            }
        };
        
        this.network.focus(nodeId, options);
    }
}

// 添加相应的CSS样式
const styles = `
    .analysis-section, .resources-section, .risks-section, .timeline-section {
        margin-bottom: 20px;
        padding: 15px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .timeline-item {
        display: flex;
        margin-bottom: 15px;
        padding-left: 20px;
        border-left: 2px solid var(--primary-color);
    }

    .timeline-date {
        min-width: 100px;
        font-weight: bold;
        color: var(--primary-color);
    }

    .risk-item, .resource-item {
        margin-bottom: 15px;
        padding: 10px;
        background: var(--background-light);
        border-radius: 6px;
    }

    .mitigation {
        color: var(--success-color);
        margin-top: 5px;
    }

    .complexity {
        color: var(--primary-color);
        font-weight: 500;
    }

    .dependencies {
        color: var(--warning-color);
        font-style: italic;
    }
`;

const additionalStyles = `
    .node-content {
        padding: 8px;
        min-width: 200px;
    }

    .node-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
    }

    .priority-badge {
        background: var(--primary-color);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.8em;
    }

    .node-description {
        color: #666;
        margin-bottom: 5px;
        font-size: 0.9em;
    }

    .node-details table {
        width: 100%;
        font-size: 0.9em;
    }

    .node-details td {
        padding: 2px 4px;
    }

    .complexity-stars {
        color: var(--warning-color);
        letter-spacing: 2px;
    }

    .progress-bar-mini {
        background: #eee;
        height: 4px;
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-bar-mini > div {
        background: var(--primary-color);
        height: 100%;
        transition: width 0.3s ease;
    }

    .node-tooltip {
        position: fixed;
        z-index: 1000;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        padding: 10px;
        max-width: 300px;
        pointer-events: none;
    }

    .tooltip-content h4 {
        margin: 0 0 5px 0;
        color: var(--primary-color);
    }

    .tooltip-content p {
        margin: 0 0 8px 0;
        font-size: 0.9em;
        color: #666;
    }

    .tooltip-details {
        font-size: 0.85em;
        color: #444;
    }

    .tooltip-details > div {
        margin: 2px 0;
    }

    .mindmap-controls {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 100;
        display: flex;
        gap: 10px;
        background: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .control-group {
        display: flex;
        gap: 8px;
    }

    .search-input {
        width: 200px;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }

    .filter-select {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }

    .icon-btn {
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: all 0.2s;
    }

    .icon-btn:hover {
        background: #f5f5f5;
        color: var(--primary-color);
    }
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = styles + additionalStyles;
document.head.appendChild(styleSheet);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TaskDecomposer();
}); 

