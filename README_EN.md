# Task Decomposition System

[中文版](README.md)

A web-based intelligent task decomposition and analysis system that helps users break down complex tasks into manageable subtasks and provides comprehensive analysis and visualization capabilities.

## Features

### 1. Intelligent Task Decomposition
- Task analysis and decomposition based on DeepSeek API
- Multi-dimensional task assessment (complexity, priority, dependencies, etc.)
- Automatic generation of task structure and relationship diagrams

### 2. Visualization
- Interactive mind map display
- Task node expansion/collapse functionality
- Node drag-and-drop and reordering
- Custom node styles and layouts

### 3. Task Management
- Task progress tracking
- Complexity assessment
- Dependency management
- Priority setting

### 4. Analysis Features
- Resource requirement analysis
- Risk assessment
- Timeline planning
- Suggestion generation

### 5. Collaboration Features
- Task comments
- Progress updates
- Team collaboration

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Visualization: vis.js
- API Integration: DeepSeek API
- Style Framework: Material Design Icons

## Quick Start

1. Clone the project
```bash
git clone [project-url]
cd [project-directory]
```

2. Configure API Key
In `app.js`, configure your DeepSeek API key:
```javascript
this.apiKey = 'your-api-key';
```

3. Launch the Project
- Use any web server to start the project
- Or use VS Code's Live Server plugin

## Usage Guide

### 1. Create New Task
1. Fill in main task information
2. Select task domain and complexity
3. Set time constraints
4. Click "Decompose Task" button

### 2. Task Editing
- Double-click nodes to edit
- Drag nodes to adjust position
- Use toolbar for zoom and export

### 3. Progress Tracking
- Update task status
- Add progress notes
- View completion status

### 4. Analysis Reports
- View resource analysis
- Check risk assessment
- Reference timeline
- View suggestions

## Custom Configuration

### 1. Template Configuration
Add custom task templates in `app.js`:
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

### 2. Style Customization
Customize theme through CSS variables:
```css
:root {
    --primary-color: your-color;
    --secondary-color: your-color;
    --warning-color: your-color;
}
```

## Notes

1. API Limitations
- Be aware of DeepSeek API call limits
- Implement appropriate caching mechanisms

2. Browser Compatibility
- Recommended browsers: Chrome, Firefox, Safari, Edge
- JavaScript must be enabled

3. Data Persistence
- Regular data saving
- Use export functionality for backup

## Contributing

1. Fork the project
2. Create feature branch
3. Submit changes
4. Create Pull Request

## License

MIT License

## Contact

For questions or suggestions, please contact through:
- Submit Issues
- Email to [your-email]

## Changelog

### v1.0.0 (2024-01)
- Initial release
- Basic functionality implementation
- Visualization features 