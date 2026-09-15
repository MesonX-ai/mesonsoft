'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  MarkerType,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * Interactive Visual Agent Builder canvas (ReactFlow) — the same concept as
 * the My Fam AI studio, restyled for the Mesonsoft brand. Mounted into the
 * home page partial via a portal into #ms-vb-root.
 */

const CATS = {
  agent:        { emoji: '🤖', color: '#9F66FF' },
  provider:     { emoji: '📧', color: '#9F66FF' },
  connector:    { emoji: '🪝', color: '#FF196E' },
  notification: { emoji: '🔔', color: '#FF6EA9' },
  action:       { emoji: '✉️', color: '#C04BFF' },
};

const PALETTE_ITEMS = [
  ['agent', 'Assistant Bot', '🤖'],
  ['provider', 'Gmail', '📧'],
  ['provider', 'Google Drive', '📁'],
  ['provider', 'WhatsApp', '💬'],
  ['connector', 'Webhook', '🪝'],
  ['notification', 'Slack Alert', '🔔'],
  ['action', 'Send Email/Text', '✉️'],
];

function defaultGraph() {
  const nodes = [
    { id: 'gmail',    type: 'ms', position: { x: 40,  y: 60  }, data: { cat: 'provider',     label: 'Gmail',           emoji: '📧' } },
    { id: 'gdrive',   type: 'ms', position: { x: 40,  y: 180 }, data: { cat: 'provider',     label: 'Google Drive',    emoji: '📁' } },
    { id: 'whatsapp', type: 'ms', position: { x: 40,  y: 300 }, data: { cat: 'provider',     label: 'WhatsApp',        emoji: '💬' } },
    { id: 'webhook',  type: 'ms', position: { x: 40,  y: 420 }, data: { cat: 'connector',    label: 'Webhook',         emoji: '🪝' } },
    { id: 'agent',    type: 'ms', position: { x: 380, y: 220 }, data: { cat: 'agent',        label: 'Assistant Bot',   emoji: '🤖' } },
    { id: 'email',    type: 'ms', position: { x: 760, y: 90  }, data: { cat: 'action',       label: 'Send Email/Text', emoji: '✉️' } },
    { id: 'slack',    type: 'ms', position: { x: 760, y: 360 }, data: { cat: 'notification', label: 'Slack Alert',     emoji: '🔔' } },
  ];
  const edges = [
    { id: 'e1', source: 'gmail',    target: 'agent' },
    { id: 'e2', source: 'gdrive',   target: 'agent' },
    { id: 'e3', source: 'whatsapp', target: 'agent' },
    { id: 'e4', source: 'webhook',  target: 'agent' },
    { id: 'e5', source: 'agent',    target: 'email' },
    { id: 'e6', source: 'agent',    target: 'slack' },
  ];
  return { nodes, edges };
}

function edgeColor(cat) {
  return cat === 'agent' ? '#FF196E' : '#9F66FF';
}

function MsNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow();
  const isAgent = data.cat === 'agent';
  return (
    <div
      className={'ms-vb-nodecard' + (isAgent ? ' ms-vb-nodecard-agent' : '') + (selected ? ' ms-vb-nodecard-selected' : '')}
    >
      <Handle type="target" position={Position.Left} className="ms-vb-handle" />
      <span className="ms-vb-ico" data-cat={data.cat}>{data.emoji}</span>
      <div className="ms-vb-nodetext">
        <p>{data.label}</p>
        <span>{data.cat}</span>
      </div>
      <Handle type="source" position={Position.Right} className="ms-vb-handle" />
      <button
        className="ms-vb-del"
        aria-label={'Remove ' + data.label}
        onClick={(evt) => {
          evt.stopPropagation();
          deleteElements({ id });
        }}
      >
        ×
      </button>
    </div>
  );
}

function CanvasInner() {
  const initial = useMemo(defaultGraph, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [pending, setPending] = useState(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params) => {
      if (!params.source || !params.target || params.source === params.target) return;
      setEdges((eds) => addEdge({ ...params }, eds));
      setPending(null);
    },
    [setEdges]
  );

  /** My Fam AI style wiring: click one node, then click another. */
  const onNodeClick = useCallback(
    (evt, node) => {
      if (!pending) {
        setPending(node.id);
        return;
      }
      if (pending === node.id) {
        setPending(null);
        return;
      }
      onConnect({ source: pending, target: node.id });
    },
    [pending, onConnect]
  );

  const styledEdge = useCallback(
    (edge) => {
      const src = nodes.find((n) => n.id === edge.source);
      const color = edgeColor(src ? src.data.cat : 'provider');
      return {
        ...edge,
        animated: true,
        style: { stroke: color, strokeWidth: 2, strokeDasharray: '6 6' },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
      };
    },
    [nodes]
  );

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const cat = evt.dataTransfer.getData('application/ms-vb-cat');
      if (!cat) return;
      const item = PALETTE_ITEMS.find((it) => it[0] === cat);
      const position = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      setNodes((nds) =>
        nds.concat({
          id: cat + '-' + Date.now(),
          type: 'ms',
          position,
          data: { cat, label: item ? item[1] : cat, emoji: item ? item[2] : '🤖' },
        })
      );
    },
    [screenToFlowPosition, setNodes]
  );

  const saveWorkflow = useCallback(() => {
    const data = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.data.cat, label: n.data.label, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      links: edges.map((e) => ({ source: e.source, target: e.target })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mesonx-workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  return (
    <div className="ms-vb-wrap" aria-label="Visual agent builder canvas — My Fam AI">
      <div className="ms-vb-head">
        <span className="ms-vb-dot" /><span className="ms-vb-dot" /><span className="ms-vb-dot" />
        <span className="ms-vb-title">Visual Agent Builder</span>
        <span className="ms-vb-chip ms-vb-chip-run">● live</span>
      </div>
      <div className="ms-vb-body">
        <aside className="ms-vb-palette">
          <p className="ms-vb-palette-title">Palette — drag onto canvas</p>
          {PALETTE_ITEMS.map((it) => (
            <div
              key={it[1]}
              className="ms-vb-item"
              draggable
              onDragStart={(evt) => {
                evt.dataTransfer.setData('application/ms-vb-cat', it[0]);
                evt.dataTransfer.effectAllowed = 'move';
              }}
            >
              <span className="ms-vb-ico" data-cat={it[0]}>{it[2]}</span>
              <div><p>{it[1]}</p><span>{it[0]}</span></div>
            </div>
          ))}
          <div className="ms-vb-toolbar">
            <span className="ms-vb-chip">{nodes.length} nodes</span>
            <span className="ms-vb-chip">{edges.length} links</span>
            <button className="ms-vb-btn ms-vb-btn-danger" type="button" onClick={() => { setNodes([]); setEdges([]); setPending(null); }}>Clear</button>
            <button className="ms-vb-btn" type="button" onClick={() => { const g = defaultGraph(); setNodes(g.nodes); setEdges(g.edges); setPending(null); }}>Reset</button>
            <button className="ms-vb-btn ms-vb-btn-save" type="button" onClick={saveWorkflow}>Save</button>
          </div>
        </aside>
        <div className="ms-vb-canvascol">
          <div className="ms-vb-hintbar">
            <span className="ms-vb-chip">🔗 {pending ? 'Now click a second node to connect' : 'Click a node to start a connection'}</span>
          </div>
          <div className="ms-vb-stage">
            <ReactFlow
              nodes={nodes}
              edges={edges.map(styledEdge)}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={() => setPending(null)}
              onDrop={onDrop}
              onDragOver={(evt) => { evt.preventDefault(); evt.dataTransfer.dropEffect = 'move'; }}
              nodeTypes={{ ms: MsNode }}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.4}
              maxZoom={1.4}
              proOptions={{ hideAttribution: true }}
              className="ms-vb-flow"
            >
              <Background gap={22} size={2} color="#e6dff2" />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentCanvas() {
  const [host, setHost] = useState(null);
  useEffect(() => {
    const el = document.getElementById('ms-vb-root');
    if (el) setHost(el);
  }, []);
  if (!host) return null;
  return createPortal(
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>,
    host
  );
}
