import { CATALOGUE } from "@/lib/methods";
import { Table, Td, Th } from "./ui";

/**
 * Front matter: every technique on one screen.
 *
 * The data page is a record you scroll through, so it needs an index rail and
 * position tracking. This is a catalogue, and what a reader wants from a
 * catalogue is comparison — which techniques are mitigated, which ask
 * permission, how many there are of each kind. So the index carries that
 * information rather than being a list of links beside the text.
 */
export function MethodsSummary() {
  return (
    <section id="index" className="mb-16">
      <Table cols={["3rem", "auto", "34%", "6.5rem"]}>
        <thead>
          <tr>
            <Th className="text-right">No.</Th>
            <Th>Technique</Th>
            <Th>Where defenses stand</Th>
            <Th className="text-right">Asks first</Th>
          </tr>
        </thead>
        {CATALOGUE.map((group) => (
          <tbody key={group.id}>
            <tr>
              <td colSpan={4} className="border-b border-ink pt-6 pb-1.5">
                <a
                  href={`#${group.id}`}
                  className="text-sm font-medium no-underline hover:underline"
                >
                  {group.title}
                </a>
                <span className="ml-2 text-xs text-ink-faint tabular">
                  {group.methods.length}
                </span>
              </td>
            </tr>
            {group.methods.map((method) => (
              <tr
                key={method.name}
                className="align-baseline transition-colors duration-100 hover:bg-sunken/60"
              >
                <Td className="text-right font-mono text-sm text-ink-faint tabular">
                  {method.number}
                </Td>
                <Td>
                  <a href={`#${method.slug}`} className="text-sm no-underline hover:underline">
                    {method.name}
                  </a>
                </Td>
                <Td className="text-sm text-ink-muted">{method.standing}</Td>
                <Td className="text-right text-sm text-ink-muted">
                  {group.id === "gated" ? "yes" : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        ))}
      </Table>
    </section>
  );
}
