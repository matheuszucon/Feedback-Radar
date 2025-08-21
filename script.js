// Adiciona um listener que executa o código quando o DOM estiver totalmente carregado.
// Isso garante que todos os elementos HTML existam antes de tentarmos manipulá-los.
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos principais da página que serão manipulados.
    const form = document.getElementById('feedback-form');
    const feedbackList = document.getElementById('feedback-list');
    const chartCanvas = document.getElementById('feedback-chart');
    const filterContainer = document.querySelector('.filters');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    // Variáveis globais para armazenar os feedbacks e a instância do gráfico.
    let feedbacks = [];
    let feedbackChart;

    // --- LÓGICA DO TEMA (DARK/LIGHT MODE) ---

    /**
     * Define o tema da aplicação (claro ou escuro).
     * @param {string} theme - O tema a ser aplicado ('dark' ou 'light').
     */
    const setTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.remove('dark-mode');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        // Salva a preferência de tema no LocalStorage para persistência.
        localStorage.setItem('theme', theme);
        updateChart(); // Atualiza o gráfico para refletir as cores do novo tema.
    };

    // Adiciona o evento de clique ao botão de alternar tema (se existir).
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            setTheme(currentTheme);
        });
    }

    /**
     * Carrega o tema salvo ou detecta a preferência do sistema.
     */
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (systemPrefersDark) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    };

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Carrega os feedbacks salvos no LocalStorage.
     */
    const loadFeedbacks = () => {
        const storedFeedbacks = localStorage.getItem('feedbacks');
        feedbacks = storedFeedbacks ? JSON.parse(storedFeedbacks) : [];
    };

    /**
     * Salva o array de feedbacks no LocalStorage.
     */
    const saveFeedbacks = () => {
        localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    };

    /**
     * Renderiza a lista de feedbacks na tela, aplicando um filtro se necessário.
     * @param {string|number} filter - O filtro a ser aplicado ('all' ou uma nota de 1 a 5).
     */
    const renderFeedbacks = (filter = 'all') => {
        if (!feedbackList) return; // Verifica se o elemento existe
        
        feedbackList.innerHTML = ''; // Limpa a lista atual.
        const filteredFeedbacks = filter === 'all' ? feedbacks : feedbacks.filter(fb => fb.rating == filter);

        if (filteredFeedbacks.length === 0) {
            feedbackList.innerHTML = '<li>Nenhum feedback encontrado.</li>';
            return;
        }

        filteredFeedbacks.forEach((fb, index) => {
            const li = document.createElement('li');
            li.className = 'feedback-item fade-in-up';
            li.style.animationDelay = `${index * 0.1}s`;
            const ratingStars = fb.rating === 1 ? 
                Array.from({length: fb.rating}, (_, i) => `<span style="--i: ${i}">★</span>`).join('') + 
                Array.from({length: 5 - fb.rating}, () => `<span style="color: var(--border-color);">★</span>`).join('') :
                Array.from({length: fb.rating}, (_, i) => `<span style="--i: ${i}">★</span>`).join('') + 
                Array.from({length: 5 - fb.rating}, () => `<span style="color: var(--border-color);">★</span>`).join('');
            li.innerHTML = `
                <div class="feedback-header">
                    <strong>${escapeHTML(fb.username)}</strong>
                    <div class="feedback-rating">${ratingStars}</div>
                </div>
                <p class="feedback-comment">${fb.comment ? escapeHTML(fb.comment) : 'Nenhum comentário.'}</p>
            `;
            feedbackList.appendChild(li);
        });
    };

    /**
     * Atualiza ou cria o gráfico de distribuição de notas.
     */
    const updateChart = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#f9fafb' : '#111827';
        const gridColor = isDarkMode ? '#374151' : '#d1d5db';

        const ratingsCount = [0, 0, 0, 0, 0];
        feedbacks.forEach(fb => { ratingsCount[fb.rating - 1]++; });

        const chartData = {
            labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
            datasets: [{
                label: 'Número de Avaliações',
                data: ratingsCount,
                backgroundColor: ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'],
                borderColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderWidth: 2,
                borderRadius: 4,
            }]
        };

        if (feedbackChart) {
            // Se o gráfico já existe, apenas atualiza seus dados e cores.
            feedbackChart.data = chartData;
            feedbackChart.options.scales.x.ticks.color = textColor;
            feedbackChart.options.scales.y.ticks.color = textColor;
            feedbackChart.options.scales.x.grid.color = gridColor;
            feedbackChart.options.scales.y.grid.color = gridColor;
            feedbackChart.options.datasets.bar.borderColor = isDarkMode ? '#1f2937' : '#ffffff';
            feedbackChart.update();
        } else if (chartCanvas) {
            // Se o gráfico não existe, cria uma nova instância.
            const ctx = chartCanvas.getContext('2d');
            feedbackChart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: textColor }, grid: { color: gridColor } },
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    };

    /**
     * Escapa caracteres HTML de uma string para prevenir ataques XSS.
     * @param {string} str - A string de entrada.
     * @returns {string} A string segura para ser inserida no HTML.
     */
    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    };

    // --- MANIPULADORES DE EVENTOS ---

    // Evento de envio do formulário.
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Impede o recarregamento da página.
            const username = document.getElementById('username').value;
            const ratingElement = document.querySelector('input[name="rating"]:checked');
            const rating = ratingElement ? ratingElement.value : '5';
            const comment = document.getElementById('comment').value;

            const newFeedback = { id: Date.now(), username, rating: parseInt(rating), comment };

            feedbacks.unshift(newFeedback); // Adiciona o novo feedback no início do array.
            saveFeedbacks();
            renderFeedbacks();
            updateChart();
            form.reset(); // Limpa os campos do formulário.
        });
    }

    // Evento de clique nos botões de filtro (usando delegação de eventos).
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                renderFeedbacks(e.target.dataset.filter);
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    // Funções que são executadas assim que a página carrega.
    loadFeedbacks();
    renderFeedbacks();
    loadTheme(); // Carrega o tema e, consequentemente, chama updateChart().
});
