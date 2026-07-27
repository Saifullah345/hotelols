/**
 * Renders a structured-data block. Next.js keeps this in the server-rendered HTML,
 * so crawlers see it without executing any client JS.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Escaping `<` prevents a `</script>` inside any DB-sourced string from closing the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
