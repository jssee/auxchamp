<script lang="ts">
	type Props = { phase: 'pending' | 'submitting' | 'voting' | 'scored' };

	const { phase }: Props = $props();

	const colors: Record<Props['phase'], string> = {
		pending: 'bg-neutral-100 text-neutral-600',
		submitting: 'bg-green-100 text-green-800',
		voting: 'bg-purple-100 text-purple-800',
		scored: 'bg-blue-100 text-blue-800',
	};
</script>

<span class="rounded-full px-2 py-0.5 text-xs {colors[phase]}">{phase}</span>
