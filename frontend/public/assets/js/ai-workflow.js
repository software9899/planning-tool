/**
 * AI Workflow Visualization
 * Shows the step-by-step process of AI agents working together
 */

(function() {
    'use strict';

    const workflowOverlay = document.getElementById('workflowOverlay');
    const workflowContent = document.getElementById('workflowContent');
    const workflowClose = document.getElementById('workflowClose');

    // Close workflow popup
    if (workflowClose) {
        workflowClose.addEventListener('click', hideWorkflow);
    }

    // Close on overlay click
    if (workflowOverlay) {
        workflowOverlay.addEventListener('click', (e) => {
            if (e.target === workflowOverlay) {
                hideWorkflow();
            }
        });
    }

    // Show workflow popup
    window.showWorkflow = function(userMessage) {
        workflowOverlay.classList.add('active');
        workflowContent.innerHTML = '';

        // Start the workflow simulation
        simulateWorkflow(userMessage);
    };

    // Hide workflow popup
    function hideWorkflow() {
        workflowOverlay.classList.remove('active');
    }

    // Simulate AI workflow
    async function simulateWorkflow(userMessage) {
        const steps = [
            {
                title: 'Understanding Query',
                agent: null,
                description: 'Analyzing your question and determining the best approach',
                duration: 800
            },
            {
                title: 'Research Phase',
                agent: 'researcher',
                agentName: '🔍 Research Agent',
                discussions: [
                    { agent: 'researcher', text: 'I\'ll search through the task database and localStorage' },
                    { agent: 'researcher', text: `Looking for information related to: "${userMessage}"` },
                    { agent: 'researcher', text: 'Found relevant data! Compiling results...' }
                ],
                duration: 1500
            },
            {
                title: 'Data Analysis',
                agent: 'analyzer',
                agentName: '📊 Analysis Agent',
                discussions: [
                    { agent: 'analyzer', text: 'Receiving data from Research Agent' },
                    { agent: 'researcher', text: 'Here\'s what I found: task counts, statuses, and priorities' },
                    { agent: 'analyzer', text: 'Processing statistics and calculating metrics...' },
                    { agent: 'analyzer', text: 'Identifying patterns and trends' }
                ],
                duration: 1800
            },
            {
                title: 'Response Synthesis',
                agent: 'synthesizer',
                agentName: '✨ Synthesis Agent',
                discussions: [
                    { agent: 'synthesizer', text: 'Combining insights from research and analysis' },
                    { agent: 'analyzer', text: 'The data shows interesting patterns in task completion' },
                    { agent: 'synthesizer', text: 'Formatting the response in a user-friendly way' },
                    { agent: 'synthesizer', text: 'Adding relevant emojis and formatting...' }
                ],
                duration: 1200
            },
            {
                title: 'Quality Check',
                agent: null,
                description: 'Verifying accuracy and completeness of the response',
                duration: 600
            },
            {
                title: 'Response Ready',
                agent: null,
                description: 'Delivering the final answer to you',
                duration: 400
            }
        ];

        // Process each step
        for (let i = 0; i < steps.length; i++) {
            await processStep(steps[i], i + 1);
        }

        // Auto-close after completion
        setTimeout(() => {
            hideWorkflow();
        }, 2000);
    }

    // Process a single step
    function processStep(step, stepNumber) {
        return new Promise((resolve) => {
            const stepEl = createStepElement(step, stepNumber);
            workflowContent.appendChild(stepEl);

            // Update status to processing
            const statusEl = stepEl.querySelector('.step-status');
            statusEl.textContent = '⏳ Processing...';
            statusEl.className = 'step-status processing';

            // Add animation delay
            setTimeout(() => {
                stepEl.style.animationDelay = '0s';
                stepEl.style.opacity = '1';
            }, 100);

            // Show discussions if available
            if (step.discussions) {
                const discussionEl = stepEl.querySelector('.agent-discussion');
                showDiscussions(discussionEl, step.discussions, () => {
                    // Mark as completed
                    statusEl.textContent = '✓ Completed';
                    statusEl.className = 'step-status completed';
                    resolve();
                });
            } else {
                // No discussion, just wait duration
                setTimeout(() => {
                    statusEl.textContent = '✓ Completed';
                    statusEl.className = 'step-status completed';
                    resolve();
                }, step.duration);
            }
        });
    }

    // Show agent discussions
    function showDiscussions(container, discussions, onComplete) {
        let delay = 0;

        discussions.forEach((discussion, index) => {
            setTimeout(() => {
                const messageEl = createAgentMessage(discussion);
                container.appendChild(messageEl);

                // Call onComplete after last message
                if (index === discussions.length - 1) {
                    setTimeout(onComplete, 500);
                }
            }, delay);

            delay += 800; // Delay between messages
        });
    }

    // Create step element
    function createStepElement(step, stepNumber) {
        const div = document.createElement('div');
        div.className = 'workflow-step';
        div.style.animationDelay = `${stepNumber * 0.1}s`;

        let bodyContent = '';
        if (step.description) {
            bodyContent = `<p style="margin: 0; color: #666;">${step.description}</p>`;
        }
        if (step.discussions) {
            bodyContent += '<div class="agent-discussion"></div>';
        }

        div.innerHTML = `
            <div class="step-header">
                <div class="step-number">${stepNumber}</div>
                <div class="step-title">${step.title}</div>
                <div class="step-status processing">⏳ Waiting...</div>
            </div>
            <div class="step-body">
                ${bodyContent}
            </div>
        `;

        return div;
    }

    // Create agent message element
    function createAgentMessage(discussion) {
        const div = document.createElement('div');
        div.className = 'agent-message';

        const agentClass = `agent-${discussion.agent}`;
        const agentEmoji = {
            'researcher': '🔍',
            'analyzer': '📊',
            'synthesizer': '✨'
        }[discussion.agent] || '🤖';

        const agentNameText = {
            'researcher': 'Research Agent',
            'analyzer': 'Analysis Agent',
            'synthesizer': 'Synthesis Agent'
        }[discussion.agent] || 'AI Agent';

        div.innerHTML = `
            <div class="agent-avatar ${agentClass}">${agentEmoji}</div>
            <div class="agent-content">
                <div class="agent-name">${agentNameText}</div>
                <div class="agent-text">${discussion.text}</div>
            </div>
        `;

        return div;
    }

    // Make hideWorkflow available globally for close button
    window.hideWorkflow = hideWorkflow;
})();
