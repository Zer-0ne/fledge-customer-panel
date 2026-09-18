/**
 * JSON-LD structured data block (schema.org).
 *
 * Server component on purpose: the script ships in the initial HTML so search
 * engines and AI answer engines read it without executing JavaScript.
 */
export function JsonLd({
  data,
  id,
}: {
  data: Record<string, unknown>;
  id?: string;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // JSON.stringify output is escaped-safe for script context because the
      // payload is authored in-repo (no user input is ever passed here).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
