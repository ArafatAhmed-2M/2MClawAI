/**
 * 2M Claw Custom Skill Template
 * Save this file in the /skills directory and restart the Gateway.
 */

module.exports = {
    name: "example_skill",
    description: "An example skill that responds to greetings.",
    
    // The trigger words or regex that activate this skill
    triggers: ["hello", "hi", "greetings"],
    
    // The main execution function
    execute: async (context, args) => {
        return {
            success: true,
            response: "Hello there! I am 2M Claw, your AI assistant."
        };
    }
};
