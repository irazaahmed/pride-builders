import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Naya Project</h1>
      <p className="mt-1 text-muted-foreground">
        Project banane ke baad iski flat structure define karein.
      </p>
      <div className="mt-6">
        <NewProjectForm />
      </div>
    </div>
  );
}
