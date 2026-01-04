// Personality System - OCEAN model with MBTI/Enneagram overlays

const PersonalityEngine = {
    // Base OCEAN scores (0-100, starting at 50)
    ocean: {
        O: 50, // Openness
        C: 50, // Conscientiousness
        E: 50, // Extraversion
        A: 50, // Agreeableness
        N: 50  // Neuroticism
    },

    // Confidence bands for each trait (narrower = more confident)
    confidence: {
        O: 30, C: 30, E: 30, A: 30, N: 30
    },

    // Stress level (affects decision-making)
    stress: 30,

    // Accumulated trajectory tags
    trajectoryTags: {},

    // Full trait names
    traitNames: {
        O: 'Openness',
        C: 'Conscientiousness',
        E: 'Extraversion',
        A: 'Agreeableness',
        N: 'Neuroticism'
    },

    // Reset to defaults
    reset() {
        this.ocean = { O: 50, C: 50, E: 50, A: 50, N: 50 };
        this.confidence = { O: 30, C: 30, E: 30, A: 30, N: 30 };
        this.stress = 30;
        this.trajectoryTags = {};
    },

    // Apply weights from an assessment question
    applyWeights(weights) {
        for (const trait in weights) {
            if (this.ocean.hasOwnProperty(trait)) {
                this.ocean[trait] = Math.max(0, Math.min(100, this.ocean[trait] + weights[trait]));
                // Reduce confidence band as we get more data
                this.confidence[trait] = Math.max(5, this.confidence[trait] - 2);
            }
        }
    },

    // Apply stress delta
    applyStress(delta) {
        this.stress = Math.max(0, Math.min(100, this.stress + delta));
    },

    // Add trajectory tags
    addTrajectoryTags(tags) {
        tags.forEach(tag => {
            this.trajectoryTags[tag] = (this.trajectoryTags[tag] || 0) + 1;
        });
    },

    // Get dominant trajectory tags (sorted by frequency)
    getDominantTrajectories(count = 5) {
        return Object.entries(this.trajectoryTags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([tag]) => tag);
    },

    // Derive MBTI type from OCEAN
    deriveMBTI() {
        const E_I = this.ocean.E >= 50 ? 'E' : 'I';
        const S_N = this.ocean.O >= 50 ? 'N' : 'S';
        const T_F = this.ocean.A >= 50 ? 'F' : 'T';
        const J_P = this.ocean.C >= 50 ? 'J' : 'P';
        return E_I + S_N + T_F + J_P;
    },

    // Get MBTI description
    getMBTIDescription() {
        const type = this.deriveMBTI();
        const descriptions = {
            'INTJ': 'The Architect - Strategic and independent',
            'INTP': 'The Logician - Analytical and inventive',
            'ENTJ': 'The Commander - Bold and strategic',
            'ENTP': 'The Debater - Clever and curious',
            'INFJ': 'The Advocate - Insightful and principled',
            'INFP': 'The Mediator - Empathetic and idealistic',
            'ENFJ': 'The Protagonist - Charismatic and inspiring',
            'ENFP': 'The Campaigner - Enthusiastic and creative',
            'ISTJ': 'The Logistician - Practical and reliable',
            'ISFJ': 'The Defender - Dedicated and warm',
            'ESTJ': 'The Executive - Organized and logical',
            'ESFJ': 'The Consul - Caring and social',
            'ISTP': 'The Virtuoso - Observant and practical',
            'ISFP': 'The Adventurer - Flexible and charming',
            'ESTP': 'The Entrepreneur - Smart and perceptive',
            'ESFP': 'The Entertainer - Spontaneous and energetic'
        };
        return { type, description: descriptions[type] || 'Unique blend' };
    },

    // Derive Enneagram type from OCEAN patterns
    deriveEnneagram() {
        const { O, C, E, A, N } = this.ocean;

        // Simplified mapping based on dominant patterns
        const scores = {
            1: C * 1.5 + (100 - A) * 0.5 - O * 0.3,           // Perfectionist
            2: A * 1.5 + E * 0.5 + N * 0.3,                    // Helper
            3: C * 1.0 + E * 1.0 + (100 - A) * 0.5,           // Achiever
            4: O * 1.0 + N * 1.0 + (100 - E) * 0.5,           // Individualist
            5: O * 1.0 + (100 - E) * 1.0 + (100 - A) * 0.5,   // Investigator
            6: N * 1.0 + A * 0.5 + C * 0.5,                    // Loyalist
            7: O * 1.0 + E * 1.0 + (100 - N) * 0.5,           // Enthusiast
            8: E * 1.0 + (100 - A) * 1.0 + (100 - N) * 0.5,   // Challenger
            9: A * 1.0 + (100 - N) * 1.0 + (100 - C) * 0.3    // Peacemaker
        };

        const type = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])[0][0];

        const descriptions = {
            1: 'Type 1: The Perfectionist - Principled, purposeful, self-controlled',
            2: 'Type 2: The Helper - Generous, demonstrative, people-pleasing',
            3: 'Type 3: The Achiever - Adaptable, excelling, driven',
            4: 'Type 4: The Individualist - Expressive, dramatic, self-absorbed',
            5: 'Type 5: The Investigator - Perceptive, innovative, isolated',
            6: 'Type 6: The Loyalist - Engaging, responsible, anxious',
            7: 'Type 7: The Enthusiast - Spontaneous, versatile, scattered',
            8: 'Type 8: The Challenger - Self-confident, decisive, confrontational',
            9: 'Type 9: The Peacemaker - Receptive, reassuring, complacent'
        };

        return { type: parseInt(type), description: descriptions[type] };
    },

    // Calculate choice probability based on personality
    calculateChoiceProbability(choice) {
        if (!choice.ocean_weights) return 0.5;

        let alignment = 50;
        for (const trait in choice.ocean_weights) {
            if (this.ocean.hasOwnProperty(trait)) {
                const weight = choice.ocean_weights[trait];
                const traitValue = this.ocean[trait];

                // Positive weight = choice favored by high trait
                // Negative weight = choice favored by low trait
                if (weight > 0) {
                    alignment += (traitValue - 50) * (weight / 20);
                } else {
                    alignment += (50 - traitValue) * (Math.abs(weight) / 20);
                }
            }
        }

        // Stress affects choices - high stress may push toward safer options
        if (choice.stress_delta < 0) {
            alignment += this.stress * 0.2;
        } else if (choice.stress_delta > 10) {
            alignment -= this.stress * 0.15;
        }

        return Math.max(10, Math.min(90, alignment));
    },

    // Get trait level description
    getTraitLevel(trait) {
        const value = this.ocean[trait];
        if (value < 25) return 'Very Low';
        if (value < 40) return 'Low';
        if (value < 60) return 'Moderate';
        if (value < 75) return 'High';
        return 'Very High';
    },

    // Generate personality summary for narrative
    generateSummary() {
        const mbti = this.getMBTIDescription();
        const enneagram = this.deriveEnneagram();

        const highTraits = Object.entries(this.ocean)
            .filter(([_, v]) => v >= 65)
            .map(([k]) => this.traitNames[k]);

        const lowTraits = Object.entries(this.ocean)
            .filter(([_, v]) => v <= 35)
            .map(([k]) => this.traitNames[k]);

        return {
            mbti,
            enneagram,
            highTraits,
            lowTraits,
            stressLevel: this.stress,
            trajectories: this.getDominantTrajectories()
        };
    },

    // Get state for saving
    getState() {
        return {
            ocean: { ...this.ocean },
            confidence: { ...this.confidence },
            stress: this.stress,
            trajectoryTags: { ...this.trajectoryTags }
        };
    },

    // Restore from saved state
    restoreState(state) {
        this.ocean = { ...state.ocean };
        this.confidence = { ...state.confidence };
        this.stress = state.stress;
        this.trajectoryTags = { ...state.trajectoryTags };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalityEngine;
}
