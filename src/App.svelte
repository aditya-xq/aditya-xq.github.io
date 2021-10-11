<script lang="ts">
    import {ToggleButton, IconBar} from './svelte-xq/index.js';
    import constants from './constants';
    function toggle() {
	    window.document.body.classList.toggle('dark-mode')
}
</script>

<style type="text/scss">
    @import './global.scss';
    .title {
        width: 100%;
        text-align: center;
        padding-top: 15vh;
    }
    .content {
        width: 100%;
        text-align: center;
    }
</style>

<main>
    <h1 class="title">{'Hello world! XQ here :P'}</h1>
    <div><ToggleButton style="sliderbox" onClick={toggle}/></div>
    <div><IconBar style="minimal" links={constants.socialLinks}/></div>
    <div class="content">{'Stay tuned for the updated website'}</div>
</main>