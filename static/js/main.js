document.addEventListener('DOMContentLoaded', () => {

    const toolbox = document.getElementById('modules-toolbox');
    const canvas = document.getElementById('resume-canvas');
    let allModulesData = [];
    let userProjects = [];
    let charts = {};

    async function loadData() {
        try {
            const response = await fetch('/api/modules');
            const data = await response.json();
            allModulesData = data.modules;
            userProjects = data.user_projects;
            renderToolbox();
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            toolbox.innerHTML = '<p style="color: red;">Не удалось загрузить данные.</p>';
        }
    }

    // логика рендера

    function createToolboxCard(module) {
        return `
            <div class="toolbox-card" data-module-id="${module.id}">
                <i class="material-icons">${module.icon || 'extension'}</i>
                <span>${module.title}</span>
            </div>
        `;
    }

    function renderToolbox() {
        toolbox.innerHTML = '';
        allModulesData.forEach(module => {
            toolbox.innerHTML += createToolboxCard(module);
        });
    }

    function renderModuleOnCanvas(module) {
        let content = '';
        const settingsButton = module.is_configurable ?
            `<button class="settings-btn" data-module-id="${module.id}"><i class="material-icons">settings</i></button>` : '';

        switch (module.type) {
            case 'github_stats':
                content = `
                    <h3>${module.title}</h3>
                    <div class="stats-grid">
                        <div><span>${module.data.contributions}</span> вкладов</div>
                        <div><span>${module.data.stars}</span> звёзд</div>
                        <div><span>${module.data.repositories}</span> репозиториев</div>
                    </div>
                    <h4>Основные языки:</h4>
                    ${module.data.top_languages.map(lang => `
                        <div class="progress-bar">
                            <div style="width: ${lang.percent}%;">${lang.lang}</div>
                        </div>
                    `).join('')}
                `;
                break;
            case 'tech_stack':
                content = `
                    <h3>${module.title}</h3>
                    <div class="tags-container">
                        ${module.data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                `;
                break;
            case 'project_chart':
                const chartId = `chart-${module.id}-${Date.now()}`;
                // чтобы DOM успел обновиться
                setTimeout(() => initProjectChart(chartId, module.data.default_projects), 0);
                content = `
                    <h3>${module.title}</h3>
                    <canvas id="${chartId}"></canvas>
                `;
                break;
            case 'pet_project':
                content = `
                    <h3>${module.data.name}</h3>
                    <div class="pet-project-content">
                        <img src="${module.data.image}" alt="Project preview">
                        <p>${module.data.description}</p>
                    </div>
                    <a href="${module.data.link}" target="_blank">Посмотреть на GitHub</a>
                `;
                break;
            default:
                content = `<h3>Неизвестный тип модуля</h3>`;
        }
        return `<div class="module-header">${settingsButton}</div><div class="module-content">${content}</div>`;
    }

    // логика рисулек

    function initProjectChart(canvasId, projectIds) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const projectsToShow = userProjects.filter(p => projectIds.includes(p.id));
        const chartData = {
            labels: projectsToShow.map(p => p.name),
            datasets: [{
                label: 'Звёзды ★',
                data: projectsToShow.map(p => p.stars),
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }, {
                label: 'Форки',
                data: projectsToShow.map(p => p.forks),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };

        if (charts[canvasId]) {
            charts[canvasId].data = chartData;
            charts[canvasId].update();
        } else {
            charts[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    indexAxis: 'x',
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                    }
                }
            });
        }
    }

    function openSettingsModal(moduleId, canvasModuleElement) {
        const moduleData = allModulesData.find(m => m.id === moduleId);
        if (!moduleData) return;

        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal-content paper-shadow">
                <h3>Настройка модуля "${moduleData.title}"</h3>
                <p>Выберите проекты для отображения:</p>
                <div class="projects-list">
                    ${userProjects.map(p => `
                        <label>
                            <input type="checkbox" value="${p.id}">
                            ${p.name} (★${p.stars})
                        </label>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn-save">Сохранить</button>
                    <button class="btn-cancel">Отмена</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

    // логика тыкалок
		
        const btnSave = modal.querySelector('.btn-save');
        const btnCancel = modal.querySelector('.btn-cancel');
        
        btnSave.addEventListener('click', () => {
            const selectedIds = Array.from(modal.querySelectorAll('input:checked')).map(input => input.value);
            const chartCanvasId = canvasModuleElement.querySelector('canvas').id;
            initProjectChart(chartCanvasId, selectedIds);
            document.body.removeChild(modal);
        });

        btnCancel.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // логика событий

    new Sortable(toolbox, {
        group: {
            name: 'shared',
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false
    });

    new Sortable(canvas, {
        group: 'shared',
        animation: 150,
        onAdd: function (evt) {
            const itemEl = evt.item;
            const moduleId = itemEl.dataset.moduleId;
            const moduleData = allModulesData.find(m => m.id === moduleId);
            
            if (moduleData) {
                itemEl.innerHTML = renderModuleOnCanvas(moduleData);
                itemEl.className = 'canvas-module paper-shadow';
            }

            const placeholder = canvas.querySelector('.placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            const settingsBtn = itemEl.querySelector('.settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const moduleId = e.currentTarget.dataset.moduleId;
                    openSettingsModal(moduleId, itemEl);
                });
            }
        }
    });

// логика темы

const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

function applyTheme(theme) {
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        themeToggle.checked = true;
    } else {
        body.classList.remove('dark-theme');
        themeToggle.checked = false;
    }
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const defaultTheme = savedTheme || (prefersDark ? 'dark' : 'light');
applyTheme(defaultTheme);

themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});


    loadData();
});
