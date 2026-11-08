import { PageError } from "@/components/states/PageError";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Something went wrong | Nestwell",
  robots: { index: false, follow: false },
};
export default function ServerError() {
  return <PageError />;
}
