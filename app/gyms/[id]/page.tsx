import GymView from "./GymView";

export default async function GymPage(props: PageProps<"/gyms/[id]">) {
  const { id } = await props.params;
  return <GymView id={id} />;
}
