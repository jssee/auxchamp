<script lang="ts">
import { healthCheck as createHealthCheck } from "$lib/app.remote";

const healthCheck = createHealthCheck();

const TITLE_TEXT = `
   ██████╗ ███████╗████████╗████████╗███████╗██████╗
   ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
   ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
   ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
   ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
   ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

   ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
   ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
      ██║       ███████╗   ██║   ███████║██║     █████╔╝
      ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
      ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
      ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
   `;
</script>

<div class="container mx-auto max-w-3xl px-4 py-2">
	<pre class="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
	<div class="grid gap-6">
		<section class="rounded-lg border p-4">
			<h2 class="mb-2 font-medium">API Status</h2>
			{#await healthCheck}
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
					<span class="text-muted-foreground text-sm">Checking...</span>
				</div>
			{:then status}
				<div class="flex items-center gap-2">
					<div class={`h-2 w-2 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`}></div>
					<span class="text-muted-foreground text-sm">{status ? "Connected" : "Disconnected"}</span>
				</div>
			{:catch}
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-red-500"></div>
					<span class="text-muted-foreground text-sm">Disconnected</span>
				</div>
			{/await}
		</section>
	</div>
</div>
