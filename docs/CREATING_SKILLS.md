# 🔌 Extending 2M Claw: Creating Custom Skills

2M Claw is designed to be infinitely extensible. A **Skill** is a simple JavaScript module that gives the AI a new "tool" or "capability."

---

## 🏗️ Skill Architecture

All skills live in the `/skills` directory. On startup, 2M Claw's `SkillLoader` scans this folder and registers every skill with the LLM's system prompt.

### 📝 The Template

Create a new file (e.g., `my_skill.js`) in the `/skills` folder:

```javascript
module.exports = {
    name: "Weather Agent",
    description: "Fetches current weather for any city.",
    
    // Triggers help the UI and LLM identify when to use this tool
    triggers: ["weather", "temperature", "forecast"],
    
    // The execution function (async)
    execute: async (context, args) => {
        // You can use axios, fs, or any installed npm package here
        const city = args.city || "London";
        
        // Logic here...
        
        return {
            success: true,
            response: `The weather in ${city} is currently Sunny at 22°C.`
        };
    }
};
```

## 🛠️ Accessing System Resources

Inside the `execute` function, you have access to:
- **Node Modules**: `require('fs')`, `require('os')`, `require('axios')`, etc.
- **Context**: Information about the current user session.
- **FS Access**: Read and write files within the project workspace.

## 🚀 Deployment

1. Save your `.js` file in the `/skills` directory.
2. **Restart 2M Claw** (or the Gateway).
3. Verify it appears in the **Skills** tab of the Web Dashboard.
4. Tell the AI: *"Check the weather in New York"* — it will automatically identify the trigger and execute your code.

## 💡 Best Practices

- **Clear Descriptions**: The `description` is sent to the LLM. Be specific about what the skill does so the AI knows when to call it.
- **Error Handling**: Always wrap your logic in `try/catch` and return `success: false` with an error message if something goes wrong.
- **Keep it focused**: One skill should do one thing well.

---
*Back to [README.md](../README.md)*
