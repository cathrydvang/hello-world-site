// Main Application - Forks Life Simulation

const App = {
    questions: [],
    currentQuestionIndex: 0,
    currentScenario: null,

    // Initialize application
    async init() {
        // Load data
        await this.loadQuestions();
        await EventSystem.loadScenarios();

        // Set up event listeners
        this.bindEvents();

        console.log('Forks initialized');
    },

    // Load assessment questions
    async loadQuestions() {
        try {
            const response = await fetch('data/questions.json');
            const data = await response.json();
            this.questions = data.questions;
        } catch (error) {
            console.error('Failed to load questions:', error);
        }
    },

    // Bind UI event listeners
    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startAssessment());
        document.getElementById('begin-simulation-btn').addEventListener('click', () => this.startSimulation());
        document.getElementById('continue-btn').addEventListener('click', () => this.continueSimulation());
        document.getElementById('new-simulation-btn').addEventListener('click', () => this.resetAll());
        document.getElementById('explore-branch-btn').addEventListener('click', () => this.exploreBranch());
    },

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    },

    // Start the personality assessment
    startAssessment() {
        PersonalityEngine.reset();
        this.currentQuestionIndex = 0;
        this.showScreen('assessment-screen');
        this.renderQuestion();
    },

    // Render current assessment question
    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const total = this.questions.length;

        // Update progress
        const progress = ((this.currentQuestionIndex) / total) * 100;
        document.getElementById('assessment-progress').style.width = `${progress}%`;
        document.getElementById('question-counter').textContent =
            `Question ${this.currentQuestionIndex + 1} of ${total}`;

        // Render question
        document.getElementById('question-text').textContent = question.text;

        // Render choices
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        question.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.addEventListener('click', () => this.handleAssessmentChoice(choice));
            container.appendChild(btn);
        });
    },

    // Handle assessment choice
    handleAssessmentChoice(choice) {
        // Apply weights
        PersonalityEngine.applyWeights(choice.weights);

        // Next question or show profile
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.questions.length) {
            this.renderQuestion();
        } else {
            this.showProfile();
        }
    },

    // Show personality profile
    showProfile() {
        this.showScreen('profile-screen');

        // Render OCEAN traits
        const oceanContainer = document.getElementById('ocean-display');
        oceanContainer.innerHTML = '';

        const traits = ['O', 'C', 'E', 'A', 'N'];
        traits.forEach(trait => {
            const value = PersonalityEngine.ocean[trait];
            const row = document.createElement('div');
            row.className = 'trait-row';
            row.innerHTML = `
                <span class="trait-label">${PersonalityEngine.traitNames[trait]}</span>
                <div class="trait-bar">
                    <div class="trait-fill" style="width: ${value}%"></div>
                </div>
                <span class="trait-value">${Math.round(value)}</span>
            `;
            oceanContainer.appendChild(row);
        });

        // Render personality labels
        const labelsContainer = document.getElementById('personality-labels');
        const mbti = PersonalityEngine.getMBTIDescription();
        const enneagram = PersonalityEngine.deriveEnneagram();

        labelsContainer.innerHTML = `
            <p><strong>MBTI:</strong> ${mbti.type} - ${mbti.description}</p>
            <p><strong>Enneagram:</strong> ${enneagram.description}</p>
        `;
    },

    // Start life simulation
    startSimulation() {
        EventSystem.reset();
        this.showScreen('simulation-screen');
        this.presentNextScenario();
    },

    // Present next scenario
    presentNextScenario() {
        // Check if simulation should end
        if (EventSystem.shouldEndSimulation()) {
            this.showTimeline();
            return;
        }

        // Get next scenario
        this.currentScenario = EventSystem.selectNextScenario();

        if (!this.currentScenario) {
            this.showTimeline();
            return;
        }

        // Update header
        const stageLabel = EventSystem.stages[EventSystem.currentStage].label;
        document.getElementById('life-stage-badge').textContent = stageLabel;
        document.getElementById('age-display').textContent = `Age: ${EventSystem.currentAge}`;

        // Render scenario
        document.getElementById('event-title').textContent = this.currentScenario.title;
        document.getElementById('event-description').textContent = this.currentScenario.description;

        // Render choices
        const choicesContainer = document.getElementById('event-choices');
        choicesContainer.innerHTML = '';

        this.currentScenario.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'event-choice-btn';

            const alignment = EventSystem.getChoiceAlignment(choice);
            const alignmentHint = alignment !== 'neutral' ? `(${alignment})` : '';

            btn.innerHTML = `
                <div class="choice-title">${choice.title}</div>
                <div class="choice-hint">${choice.description} ${alignmentHint}</div>
            `;
            btn.addEventListener('click', () => this.handleEventChoice(choice));
            choicesContainer.appendChild(btn);
        });

        // Render trajectory tags
        this.renderTrajectoryTags();
    },

    // Render current trajectory tags
    renderTrajectoryTags() {
        const container = document.getElementById('trajectory-tags');
        const tags = PersonalityEngine.getDominantTrajectories(5);

        container.innerHTML = tags.map(tag =>
            `<span class="trajectory-tag">${tag}</span>`
        ).join('');
    },

    // Handle event choice
    handleEventChoice(choice) {
        const event = EventSystem.processChoice(this.currentScenario, choice);
        this.showOutcome(event);
    },

    // Show outcome screen
    showOutcome(event) {
        this.showScreen('outcome-screen');

        // Render outcome text
        document.getElementById('outcome-text').textContent = event.outcome;

        // Render trait changes
        const changesContainer = document.getElementById('trait-changes');
        const changes = Object.entries(event.oceanChanges);

        if (changes.length > 0) {
            changesContainer.innerHTML = changes.map(([trait, change]) => {
                const className = change > 0 ? 'positive' : 'negative';
                const sign = change > 0 ? '+' : '';
                return `
                    <div class="trait-change ${className}">
                        <span>${PersonalityEngine.traitNames[trait]}</span>
                        <span>${sign}${change}</span>
                    </div>
                `;
            }).join('');
        } else {
            changesContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No significant trait changes</p>';
        }

        // Render reflection prompt
        const promptContainer = document.getElementById('reflection-prompt');
        const prompt = EventSystem.getReflectionPrompt(this.currentScenario);

        if (prompt) {
            promptContainer.innerHTML = `<p>"${prompt}"</p>`;
            promptContainer.style.display = 'block';
        } else {
            promptContainer.style.display = 'none';
        }
    },

    // Continue simulation after outcome
    continueSimulation() {
        this.showScreen('simulation-screen');
        this.presentNextScenario();
    },

    // Show final timeline
    showTimeline() {
        this.showScreen('timeline-screen');

        const container = document.getElementById('timeline-visualization');
        const timeline = EventSystem.getTimeline();

        container.innerHTML = timeline.map(event => `
            <div class="timeline-node">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-age">Age ${event.age} - ${EventSystem.stages[event.stage].label}</div>
                    <div class="timeline-event">${event.title}</div>
                    <div class="timeline-choice">${event.choice}</div>
                </div>
            </div>
        `).join('');

        // Add final summary
        const summary = PersonalityEngine.generateSummary();
        const summaryHtml = `
            <div class="timeline-node">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-age">Journey's End - Age ${EventSystem.currentAge}</div>
                    <div class="timeline-event">Final Reflection</div>
                    <div class="timeline-choice">
                        You emerged as ${summary.mbti.type} (${summary.mbti.description.split(' - ')[0]}),
                        with tendencies toward: ${summary.trajectories.slice(0, 3).join(', ') || 'a unique path'}.
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += summaryHtml;
    },

    // Reset everything for new simulation
    resetAll() {
        PersonalityEngine.reset();
        EventSystem.reset();
        this.showScreen('welcome-screen');
    },

    // Explore a different branch (replay with same personality)
    exploreBranch() {
        EventSystem.reset();
        this.showScreen('simulation-screen');
        this.presentNextScenario();
    },

    // Save current state
    saveState() {
        const state = {
            personality: PersonalityEngine.getState(),
            events: EventSystem.getState()
        };
        localStorage.setItem('forks-save', JSON.stringify(state));
    },

    // Load saved state
    loadState() {
        const saved = localStorage.getItem('forks-save');
        if (saved) {
            const state = JSON.parse(saved);
            PersonalityEngine.restoreState(state.personality);
            EventSystem.restoreState(state.events);
            return true;
        }
        return false;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => App.init());
