import ClimbView from "./ClimbView";

export default async function ClimbPage(props: PageProps<"/climbs/[id]">) {
  const { id } = await props.params;
  return <ClimbView id={id} />;
}
