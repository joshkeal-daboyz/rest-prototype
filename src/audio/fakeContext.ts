/** Test double for the slice of AudioContext the shell uses. Records every call with the context time. */
import type { AudioContextLike, ParamLike } from "./types";

export interface LogEntry {
  node: string;
  id: number;
  op: string;
  args: unknown[];
}

export interface FakeNode {
  id: number;
  kind: string;
  props: Record<string, unknown>;
  starts: Array<{ when: number | undefined; offset: number | undefined }>;
  stops: Array<number | undefined>;
  connections: FakeNode[];
  disconnected: boolean;
  params: Record<string, FakeParam>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

export interface FakeParam extends ParamLike {
  calls: Array<{ op: string; args: number[] }>;
}

export class FakeContext {
  currentTime = 10;
  sampleRate = 8000;
  state = "suspended";
  resumeResult: "ok" | "reject" | "stay" = "ok";
  resumeCalls = 0;
  log: LogEntry[] = [];
  nodes: FakeNode[] = [];
  destination: FakeNode;
  private n = 0;

  constructor() {
    this.destination = this.make("destination", []);
  }

  resume(): Promise<void> {
    this.resumeCalls++;
    if (this.resumeResult === "reject") return Promise.reject(new Error("blocked"));
    if (this.resumeResult === "ok") this.state = "running";
    return Promise.resolve();
  }

  private param(owner: FakeNode, name: string, initial: number): FakeParam {
    const calls: Array<{ op: string; args: number[] }> = [];
    const rec = (op: string, ...args: number[]): void => {
      calls.push({ op, args });
      this.log.push({ node: owner.kind, id: owner.id, op: `${name}.${op}`, args });
    };
    const p: FakeParam = {
      value: initial,
      calls,
      setValueAtTime: (v, t) => {
        rec("setValueAtTime", v, t);
        p.value = v;
      },
      linearRampToValueAtTime: (v, t) => rec("linearRamp", v, t),
      exponentialRampToValueAtTime: (v, t) => rec("expRamp", v, t),
      setTargetAtTime: (v, t, tc) => rec("setTarget", v, t, tc),
      cancelScheduledValues: (t) => rec("cancel", t),
    };
    return p;
  }

  make(kind: string, params: Array<[string, number]>): FakeNode {
    const node: FakeNode = {
      id: ++this.n,
      kind,
      props: {},
      starts: [],
      stops: [],
      connections: [],
      disconnected: false,
      params: {},
      onended: null,
      connect: (dest: FakeNode) => {
        node.connections.push(dest);
        this.log.push({ node: kind, id: node.id, op: "connect", args: [dest.kind] });
        return dest;
      },
      disconnect: () => {
        node.disconnected = true;
      },
      start: (when?: number, offset?: number) => {
        node.starts.push({ when, offset });
        this.log.push({ node: kind, id: node.id, op: "start", args: [when ?? this.currentTime, offset ?? 0] });
      },
      stop: (when?: number) => {
        node.stops.push(when);
        this.log.push({ node: kind, id: node.id, op: "stop", args: [when ?? this.currentTime] });
      },
    };
    for (const [name, v] of params) {
      const p = this.param(node, name, v);
      node.params[name] = p;
      node[name] = p;
    }
    this.nodes.push(node);
    return node;
  }

  createOscillator = () => this.make("osc", [["frequency", 440], ["detune", 0]]) as never;
  createGain = () => this.make("gain", [["gain", 1]]) as never;
  createBiquadFilter = () => this.make("biquad", [["frequency", 350], ["Q", 1]]) as never;
  createBufferSource = () => this.make("buffersource", []) as never;
  createDynamicsCompressor = () =>
    this.make("compressor", [["threshold", -24], ["knee", 30], ["ratio", 12], ["attack", 0.003], ["release", 0.25]]) as never;
  createBuffer = (channels: number, length: number) => {
    const data = new Float32Array(length);
    void channels;
    return { getChannelData: () => data };
  };

  /** Nodes of one kind. */
  all(kind: string): FakeNode[] {
    return this.nodes.filter((n) => n.kind === kind);
  }

  /** Oscillators or buffer sources that were started at or after `after` with a real `when`. */
  started(kind: "osc" | "buffersource"): FakeNode[] {
    return this.all(kind).filter((n) => n.starts.length > 0 && n.starts[0]?.when !== undefined);
  }
}

export const asContext = (f: FakeContext): AudioContextLike => f as unknown as AudioContextLike;
