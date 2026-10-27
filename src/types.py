from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Dict, Optional, Any


class NodeKind(str, Enum):
    ENTRYPOINT = "ENTRYPOINT"
    MIDDLEWARE = "MIDDLEWARE"
    LAYOUT = "LAYOUT"
    ROUTER = "ROUTER"
    MODEL = "MODEL"
    SERVICE = "SERVICE"
    COMPONENT = "COMPONENT"
    HOOK = "HOOK"
    UTIL = "UTIL"
    TEST = "TEST"
    CONFIG = "CONFIG"
    OTHER = "OTHER"


class EdgeKind(str, Enum):
    STATIC_IMPORT = "STATIC_IMPORT"
    DYNAMIC_IMPORT = "DYNAMIC_IMPORT"
    TYPE_IMPORT = "TYPE_IMPORT"
    RE_EXPORT = "RE_EXPORT"


@dataclass
class CodeNode:
    id: str  # Normalized repo-relative path, e.g. "src/auth/session.ts"
    file_path: str
    language: str
    kind: NodeKind
    display_name: str
    lines_of_code: int = 0
    importance_score: int = 0  # 0 to 100 PageRank/In-degree metric
    in_degree: int = 0
    out_degree: int = 0
    exports: List[str] = field(default_factory=list)
    raw_imports: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["kind"] = self.kind.value
        return d


@dataclass
class CodeEdge:
    source: str  # Importer node ID
    target: str  # Imported dependency node ID
    edge_kind: EdgeKind = EdgeKind.STATIC_IMPORT
    symbols: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["edge_kind"] = self.edge_kind.value
        return d


@dataclass
class BlastRadiusReport:
    changed_files: List[str]
    affected_nodes: List[str]
    blast_radius_count: int
    risk_level: str  # "CRITICAL", "WARNING", "SAFE"
    risk_score: int  # 0 to 100
    critical_paths: List[List[str]]  # Step-by-step propagation paths
    hop_distances: Dict[str, int]
    summary: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
