export class CustomEvent {
  public defaultPrevented = false

  public preventDefault (): void {
    this.defaultPrevented = true
  }
}
