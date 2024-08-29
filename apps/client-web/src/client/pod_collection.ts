import { POD } from "@pcd/pod";
import { p } from "@pcd/podspec";

type PODQuery = ReturnType<typeof p.pod>;

export class PODCollection {
  private pods: POD[] = [];

  public insert(pod: POD): void {
    this.pods.push(pod);
  }

  public delete(signature: string): boolean {
    const newCollection = this.pods.filter(
      (pod) => pod.signature !== signature
    );
    const deleted = this.pods.length !== newCollection.length;
    this.pods = newCollection;
    return deleted;
  }

  public query(query: PODQuery): POD[] {
    return query.query(this.pods).matches;
  }
}
