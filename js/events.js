// Event System - Life scenarios and branching

const EventSystem = {
    scenarios: [],
    currentAge: 18,
    currentStage: 'early',
    eventHistory: [],
    availableScenarios: [],

    // Life stage definitions
    stages: {
        early: { min: 15, max: 25, label: 'Early Life' },
        mid: { min: 26, max: 50, label: 'Mid Life' },
        later: { min: 51, max: 80, label: 'Later Life' }
    },

    // Load scenarios from JSON
    async loadScenarios() {
        try {
            const response = await fetch('data/scenarios.json');
            const data = await response.json();
            this.scenarios = data.scenarios;
            this.trajectoryDescriptions = data.trajectory_descriptions;
            this.globalModifiers = data.global_modifiers;
            this.refreshAvailableScenarios();
            return true;
        } catch (error) {
            console.error('Failed to load scenarios:', error);
            return false;
        }
    },

    // Reset event system
    reset() {
        this.currentAge = 18;
        this.currentStage = 'early';
        this.eventHistory = [];
        this.refreshAvailableScenarios();
    },

    // Determine current life stage based on age
    updateStage() {
        if (this.currentAge <= 25) {
            this.currentStage = 'early';
        } else if (this.currentAge <= 50) {
            this.currentStage = 'mid';
        } else {
            this.currentStage = 'later';
        }
    },

    // Get available scenarios for current state
    refreshAvailableScenarios() {
        const usedIds = new Set(this.eventHistory.map(e => e.scenarioId));

        this.availableScenarios = this.scenarios.filter(scenario => {
            // Not already used
            if (usedIds.has(scenario.id)) return false;

            // Age appropriate
            if (scenario.life_stage !== 'any' && scenario.life_stage !== this.currentStage) {
                return false;
            }

            // Within age range
            const [minAge, maxAge] = scenario.age_range;
            if (this.currentAge < minAge || this.currentAge > maxAge) {
                return false;
            }

            return true;
        });
    },

    // Select next scenario based on personality and trajectory
    selectNextScenario() {
        this.refreshAvailableScenarios();

        if (this.availableScenarios.length === 0) {
            return null;
        }

        // Weight scenarios by relevance to current trajectory
        const dominantTags = PersonalityEngine.getDominantTrajectories(3);
        const weighted = this.availableScenarios.map(scenario => {
            let weight = 1;

            // Boost scenarios that match trajectory tags
            scenario.context_tags.forEach(tag => {
                if (dominantTags.some(t => tag.includes(t) || t.includes(tag))) {
                    weight += 0.5;
                }
            });

            // Slight randomness
            weight += Math.random() * 0.5;

            return { scenario, weight };
        });

        // Sort by weight and pick from top candidates
        weighted.sort((a, b) => b.weight - a.weight);
        const topCandidates = weighted.slice(0, Math.min(3, weighted.length));
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

        return selected.scenario;
    },

    // Process a choice made in a scenario
    processChoice(scenario, choice) {
        // Record the event
        const event = {
            scenarioId: scenario.id,
            title: scenario.title,
            choiceId: choice.id,
            choiceTitle: choice.title,
            age: this.currentAge,
            stage: this.currentStage,
            outcome: choice.outcome,
            oceanBefore: { ...PersonalityEngine.ocean },
            stressBefore: PersonalityEngine.stress
        };

        // Apply personality changes
        if (choice.ocean_weights) {
            PersonalityEngine.applyWeights(choice.ocean_weights);
        }

        // Apply stress changes
        if (choice.stress_delta !== undefined) {
            PersonalityEngine.applyStress(choice.stress_delta);
        }

        // Add trajectory tags
        if (choice.trajectory_tags) {
            PersonalityEngine.addTrajectoryTags(choice.trajectory_tags);
        }

        // Record changes
        event.oceanAfter = { ...PersonalityEngine.ocean };
        event.stressAfter = PersonalityEngine.stress;
        event.oceanChanges = {};

        for (const trait in event.oceanAfter) {
            const change = event.oceanAfter[trait] - event.oceanBefore[trait];
            if (change !== 0) {
                event.oceanChanges[trait] = change;
            }
        }

        this.eventHistory.push(event);

        // Advance age (variable based on event type)
        const ageAdvance = this.calculateAgeAdvance(scenario, choice);
        this.currentAge += ageAdvance;
        this.updateStage();

        return event;
    },

    // Calculate how much time passes after an event
    calculateAgeAdvance(scenario, choice) {
        // Base advance depends on life stage
        const baseAdvance = {
            early: 2,
            mid: 3,
            later: 4
        }[this.currentStage] || 2;

        // Some variation based on choice
        const variation = Math.floor(Math.random() * 2);

        return baseAdvance + variation;
    },

    // Get a random reflection prompt from a scenario
    getReflectionPrompt(scenario) {
        if (!scenario.reflection_prompts || scenario.reflection_prompts.length === 0) {
            return null;
        }
        const idx = Math.floor(Math.random() * scenario.reflection_prompts.length);
        return scenario.reflection_prompts[idx];
    },

    // Calculate personality alignment for a choice (for hints)
    getChoiceAlignment(choice) {
        const probability = PersonalityEngine.calculateChoiceProbability(choice);

        if (probability > 70) return 'strongly aligned';
        if (probability > 55) return 'somewhat aligned';
        if (probability < 30) return 'against your nature';
        if (probability < 45) return 'a stretch for you';
        return 'neutral';
    },

    // Check if simulation should end
    shouldEndSimulation() {
        // End if too old or no more scenarios
        if (this.currentAge >= 75) return true;
        this.refreshAvailableScenarios();
        if (this.availableScenarios.length === 0 && this.eventHistory.length >= 5) {
            return true;
        }
        return false;
    },

    // Get timeline data for visualization
    getTimeline() {
        return this.eventHistory.map(event => ({
            age: event.age,
            stage: event.stage,
            title: event.title,
            choice: event.choiceTitle,
            outcome: event.outcome
        }));
    },

    // Get trajectory description
    getTrajectoryDescription(tag) {
        return this.trajectoryDescriptions?.[tag] || tag;
    },

    // Get state for saving
    getState() {
        return {
            currentAge: this.currentAge,
            currentStage: this.currentStage,
            eventHistory: [...this.eventHistory]
        };
    },

    // Restore from saved state
    restoreState(state) {
        this.currentAge = state.currentAge;
        this.currentStage = state.currentStage;
        this.eventHistory = [...state.eventHistory];
        this.refreshAvailableScenarios();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventSystem;
}
