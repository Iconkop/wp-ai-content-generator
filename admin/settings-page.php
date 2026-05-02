<?php
add_action( 'admin_menu', 'aicg_add_settings_page' );
function aicg_add_settings_page() {
    add_options_page(
        'AI 内容生成器',
        'AI 内容生成',
        'manage_options',
        'ai-content-gen',
        'aicg_render_settings_page'
    );
}

function aicg_render_settings_page() {
    // 保存设置
    if ( isset( $_POST['aicg_submit'] ) && check_admin_referer( 'aicg_save' ) ) {
        $models = sanitize_textarea_field( $_POST['aicg_models'] ?? '' );
        $models = array_filter( explode( "\n", $models ), 'trim' );
        
        update_option( 'aicg_settings', [
            'base_url'    => esc_url_raw( $_POST['aicg_base_url'] ?? '' ),
            'api_key'     => sanitize_text_field( $_POST['aicg_api_key'] ?? '' ),
            'models'      => $models,
            'temperature' => floatval( $_POST['aicg_temperature'] ?? 0.7 ),
        ]);
        echo '<div class="notice notice-success"><p>设置已保存。</p></div>';
    }
    $settings = get_option( 'aicg_settings', [] );
    ?>
    <div class="wrap">
        <h1>AI 内容生成器设置</h1>
        <form method="post">
            <?php wp_nonce_field( 'aicg_save' ); ?>
            <table class="form-table">
                <tr>
                    <th><label for="aicg_base_url">API 基地址</label></th>
                    <td><input type="url" class="regular-text" id="aicg_base_url" name="aicg_base_url" 
                        value="<?php echo esc_attr( $settings['base_url'] ?? '' ); ?>" 
                        placeholder="https://api.openai.com/v1" required /></td>
                </tr>
                <tr>
                    <th><label for="aicg_api_key">API 密钥</label></th>
                    <td><input type="password" class="regular-text" id="aicg_api_key" name="aicg_api_key" 
                        value="<?php echo esc_attr( $settings['api_key'] ?? '' ); ?>" required /></td>
                </tr>
                <tr>
                    <th><label for="aicg_models">模型列表（一行一个）</label></th>
                    <td><textarea id="aicg_models" name="aicg_models" rows="4" class="large-text"><?php
                        echo esc_textarea( implode( "\n", $settings['models'] ?? [] ) );
                    ?></textarea></td>
                </tr>
                <tr>
                    <th><label for="aicg_temperature">发散度 (0-2)</label></th>
                    <td><input type="number" id="aicg_temperature" name="aicg_temperature" step="0.1" min="0" max="2" 
                        value="<?php echo esc_attr( $settings['temperature'] ?? 0.7 ); ?>" /></td>
                </tr>
            </table>
            <?php submit_button( '保存设置', 'primary', 'aicg_submit' ); ?>
        </form>
    </div>
    <?php
}