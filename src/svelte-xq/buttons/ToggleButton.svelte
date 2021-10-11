<script lang="ts">
    export let style: string;
    export let onClick;
</script>

<style src="Button.scss">
</style>

<div class="btn-toggle" on:click={onClick}>
    <span class={'switcher ' + ['switcher', style].filter(Boolean).join('-')}>
        <input type="checkbox" id="switcher">
        <label for="switcher"></label>
    </span>
</div>