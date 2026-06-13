export class AudioManager {
  constructor() {
    this.enabled = false;
  }

  play(name) {
    if (!this.enabled) {
      return;
    }

    console.debug(`Audio hook: ${name}`);
  }
}
