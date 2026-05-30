/**
 * 全局常量。
 *
 * 屏幕方向：横屏（landscape）。
 * - 微信小游戏需在「构建发布」面板将 Device Orientation 设为 Landscape
 *   （会写入 game.json 的 deviceOrientation: "landscape"）。
 * - 场景 Canvas 的 Fit Height 勾选，左右两端按全面屏留安全区。
 */
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

export const Orientation = {
    LANDSCAPE: 'landscape',
} as const;
