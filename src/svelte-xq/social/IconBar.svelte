<script lang="ts">
    export let links;
    export let style: string;
</script>

<style src="IconBar.scss">
</style>

<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
<div class={['style', style].filter(Boolean).join('-')}>
    <div class="center">
        <div id="social-test">
            <ul class="social">
                <a href={links.linkedin} target="_blank"><li><i class="fa fa-linkedin" aria-hidden="true"></i></li></a>
                <a href={links.twitter} target="_blank"><li><i class="fa fa-twitter" aria-hidden="true"></i></li></a>
                <a href={links.instagram} target="_blank"><li><i class="fa fa-instagram" aria-hidden="true"></i></li></a>
                <a href={links.github} target="_blank"><li><i class="fa fa-github" aria-hidden="true"></i></li></a>
            </ul>
        </div>
    </div>
</div>