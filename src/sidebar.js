import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import AIPanel from './components/Panel';

registerPlugin( 'aicg-sidebar', {
    icon: 'admin-generic',
    render: () => (
        <>
            <PluginSidebarMoreMenuItem target="aicg-sidebar">
                { __( 'AI 内容生成器', 'ai-content-gen' ) }
            </PluginSidebarMoreMenuItem>
            <PluginSidebar 
                name="aicg-sidebar"
                title={ __( 'AI 内容生成器', 'ai-content-gen' ) }
            >
                <AIPanel />
            </PluginSidebar>
        </>
    ),
} );