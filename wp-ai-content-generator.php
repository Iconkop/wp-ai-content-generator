<?php
/**
 * Plugin Name: AI Content Generator
 * Description: 在区块编辑器中通过 OpenAI 兼容 API 生成内容，流式输出。
 * Version: 1.0.0
 * Author: Your Name
 * Text Domain: ai-content-gen
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'AICG_VERSION', '1.0.0' );
define( 'AICG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'AICG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

// 注册后台配置页
require_once AICG_PLUGIN_DIR . 'admin/settings-page.php';

// 注册区块编辑器侧边栏
add_action( 'enqueue_block_editor_assets', 'aicg_enqueue_sidebar_assets' );
function aicg_enqueue_sidebar_assets() {
    $asset_file = include AICG_PLUGIN_DIR . 'build/sidebar.asset.php';

    wp_enqueue_script(
        'aicg-sidebar',
        AICG_PLUGIN_URL . 'build/sidebar.js',
        $asset_file['dependencies'],
        $asset_file['version'],
        true
    );

    wp_enqueue_style(
        'aicg-sidebar',
        AICG_PLUGIN_URL . 'build/sidebar.css',
        [],
        $asset_file['version']
    );

    // 传递配置给前端
    $settings = get_option( 'aicg_settings', [] );
    wp_localize_script( 'aicg-sidebar', 'aicgData', [
        'apiBase'   => esc_url_raw( $settings['base_url'] ?? '' ),
        'apiKey'    => $settings['api_key'] ?? '',
        'models'    => $settings['models'] ?? [],
        'temperature' => floatval( $settings['temperature'] ?? 0.7 ),
        'nonce'     => wp_create_nonce( 'aicg_generate' ), // 实际不需要，前端直连 API
    ]);
}

// 注册 REST API 端点用于获取配置（可选，这里前端直接从 aicgData 读取）
// 但为了安全，API key 不应直接暴露，更好的做法是后端代理请求。
// 本例为简化，直接在前端使用 API key，请在生产环境改为后端代理。