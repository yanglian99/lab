export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();

    addEventListener('keydown', (event) => {
      if (!this.keys.has(event.code)) {
        this.pressed.add(event.code);
      }
      this.keys.add(event.code);
      if ([
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Space',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
      ].includes(event.code)) {
        event.preventDefault();
      }
    });

    addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
  }

  isDown(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  endFrame() {
    this.pressed.clear();
  }
}
