/**
 * 简单的单例基类，供各 Manager / System 复用。
 */
export class Singleton<T> {
    private static _instances = new Map<unknown, unknown>();

    public static getInstance<T>(this: new () => T): T {
        const map = Singleton._instances;
        if (!map.has(this)) {
            map.set(this, new this());
        }
        return map.get(this) as T;
    }
}
