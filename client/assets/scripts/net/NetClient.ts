import { Singleton } from '../core/Singleton';

export interface ApiResponse<T> {
    code: number;
    msg?: string;
    data?: T;
}

/**
 * 网络层封装。经济相关操作（收益、库存、交易、订单）走此处请求服务端校验。
 * 约定：所有写操作携带幂等 key；服务端时间为准。
 */
export class NetClient extends Singleton<NetClient> {
    private _baseUrl = '';
    private _token = '';

    public init(baseUrl: string): void {
        this._baseUrl = baseUrl;
    }

    public setToken(token: string): void {
        this._token = token;
    }

    public async post<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
        // TODO: 接入微信小游戏 wx.request；此处用 fetch 占位以便 Web 调试。
        const res = await fetch(`${this._baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: this._token,
            },
            body: JSON.stringify(body),
        });
        return (await res.json()) as ApiResponse<T>;
    }
}
