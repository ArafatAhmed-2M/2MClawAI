# Creating Skills for 2M Claw

Skills are simple JavaScript modules that expand the capabilities of your assistant.

## The Template
Look at `skills/skill-template.js` for a starting point.

## Structure
Every skill must export an object with:
- `name` (String): Unique identifier.
- `description` (String): What the skill does.
- `triggers` (Array of Strings): Words that activate the skill.
- `execute` (Function): Async function that takes `(context, args)` and returns a `{ success, response }` object.

## Loading Skills
Simply place your `.js` file inside the `skills/` directory. The Gateway will automatically load it on the next startup.
