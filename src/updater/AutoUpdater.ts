import axios from 'axios';

export class AutoUpdater {
  private readonly REPO_URL = 'https://api.github.com/repos/ArafatAhmed-2M/2MClawAI/releases/latest';

  public async checkForUpdates() {
    try {
      const response = await axios.get(this.REPO_URL);
      const latestVersion = response.data.tag_name;
      const currentVersion = require('../../package.json').version;

      if (latestVersion !== `v${currentVersion}` && latestVersion !== currentVersion) {
        console.log(`✨ New version available! (${latestVersion}). Run 'npm run update' to upgrade.`);
      } else {
        console.log(`✔️ 2M Claw is up to date (v${currentVersion}).`);
      }
    } catch (error) {
      console.log('⚠️ Could not check for updates. Skipping.');
    }
  }
}
