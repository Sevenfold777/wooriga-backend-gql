export function getClass(instance: any): { new (...args: any[]): any } {
  return instance.constructor as { new (...args: any[]): any };
}
