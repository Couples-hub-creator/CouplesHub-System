#!/usr/bin/env python3
"""
discord science spoofer - GUI version

original by revere group, 2026. mit licensed.
this GUI adds tabbed interface for token management.
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
import webbrowser
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterator, Sequence
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

# paths
ROOT = Path(__file__).resolve().parent
GAMES_FILE = ROOT.parent / "data" / "games.json"
STATE_FILE = ROOT / "science_state.json"

ME_URL = "https://discord.com/api/v9/users/@me?with_analytics_token=true"
SCIENCE_URL = "https://discord.com/api/v9/science"
PROPERTIES_URL = "https://cordapi.dolfi.es/api/v2/properties/windows"
GAMES_CDN_URL = "https://cdn.discordapp.com/detectables/games.json"

BATCH_SIZE = 50
BATCH_DELAY = 1
AUTH_MAX_AGE = 12 * 3600

CLIENT_VERSION = "1.0.9253"
CLIENT_BUILD_NUMBER = 594031
NATIVE_BUILD_NUMBER = 88414
OS_VERSION = "10.0.26200"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) discord/1.0.9253 Chrome/148.0.7778.280 "
    "Electron/42.7.1 Safari/537.36"
)


def _user_id_from_token(token: str) -> str:
    try:
        first = token.split(".", 1)[0]
        pad = "=" * (-len(first) % 4)
        return base64.b64decode(first + pad).decode("utf-8")
    except Exception:
        return ""


_FINGERPRINT_PS1 = r'''
param(
  [int]$ProcessId = 0,
  [string]$Path,
  [Parameter(Mandatory = $true)][string]$UserId
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class CertPubKeyHash {
  const uint X509_ASN_ENCODING = 0x00000001;
  const uint PKCS_7_ASN_ENCODING = 0x00010000;
  const uint CALG_SHA_256 = 0x0000800C;

  [StructLayout(LayoutKind.Sequential)] struct Blob { public uint cbData; public IntPtr pbData; }
  [StructLayout(LayoutKind.Sequential)] struct AlgId { public IntPtr pszObjId; public Blob Parameters; }
  [StructLayout(LayoutKind.Sequential)] struct BitBlob { public uint cbData; public IntPtr pbData; public uint cUnusedBits; }
  [StructLayout(LayoutKind.Sequential)] struct PubKeyInfo { public AlgId Algorithm; public BitBlob PublicKey; }
  [StructLayout(LayoutKind.Sequential)] struct FileTime { public uint Low; public uint High; }
  [StructLayout(LayoutKind.Sequential)]
  struct CertInfo {
    public uint Version; public Blob SerialNumber; public AlgId SignatureAlgorithm; public Blob Issuer;
    public FileTime NotBefore; public FileTime NotAfter; public Blob Subject;
    public PubKeyInfo SubjectPublicKeyInfo; public BitBlob IssuerUniqueId; public BitBlob SubjectUniqueId;
    public uint ExtensionCount; public IntPtr Extensions;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct CertContext {
    public uint EncodingType; public IntPtr Encoded; public uint EncodedSize;
    public IntPtr CertInfo; public IntPtr Store;
  }

  [DllImport("crypt32.dll", SetLastError = true)]
  static extern bool CryptHashPublicKeyInfo(
    IntPtr provider, uint algid, uint flags, uint encoding, ref PubKeyInfo info, byte[] hash, ref uint hashSize);

  public static byte[] Hash(IntPtr certContext) {
    var ctx = Marshal.PtrToStructure<CertContext>(certContext);
    var info = Marshal.PtrToStructure<CertInfo>(ctx.CertInfo);
    var hash = new byte[32];
    uint hashSize = 32;
    if (!CryptHashPublicKeyInfo(IntPtr.Zero, CALG_SHA_256, 0, X509_ASN_ENCODING | PKCS_7_ASN_ENCODING, ref info.SubjectPublicKeyInfo, hash, ref hashSize) || hashSize != 32)
      throw new InvalidOperationException("CryptHashPublicKeyInfo failed");
    return hash;
  }
}
"@

if (!$Path) {
  if (!$ProcessId) { throw "Pass -Path <exe> or -ProcessId <pid>." }
  $Path = (Get-Process -Id $ProcessId).Path
}
if (!$Path) { throw "Could not resolve executable path." }

$fs = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete)
try {
  $fileSize = [UInt64]$fs.Length
  $readSize = [int][Math]::Min($fs.Length, 0x10000)
  $buf = [byte[]]::new($readSize)
  $read = $fs.Read($buf, 0, $readSize)
  if ($read -lt 0x40) { throw "File prefix is too small." }
  if ($read -ne $readSize) { [Array]::Resize([ref]$buf, $read) }
} finally {
  $fs.Dispose()
}

if ([BitConverter]::ToUInt16($buf, 0) -ne 0x5A4D) { throw "Not an MZ executable." }
$pe = [BitConverter]::ToInt32($buf, 0x3C)
if ($pe -lt 0 -or [BitConverter]::ToUInt32($buf, $pe) -ne 0x4550) { throw "Not a PE executable." }

$fh = $pe + 4
$sections = [BitConverter]::ToUInt16($buf, $fh + 2)
$timestamp = [BitConverter]::ToUInt32($buf, $fh + 4)
$optSize = [BitConverter]::ToUInt16($buf, $fh + 16)
$opt = $fh + 20
$isPe32Plus = [BitConverter]::ToUInt16($buf, $opt) -eq 0x20B
if (!$isPe32Plus) { throw "Discord only fingerprints PE32+." }
$sizeOfImage = [BitConverter]::ToUInt32($buf, $opt + 56)

$sectionTable = $opt + $optSize
$sha256 = [Security.Cryptography.SHA256]::Create()
$headerHash = $sha256.ComputeHash([byte[]]$buf[0..($sectionTable - 1)])
$sectionHash = $sha256.ComputeHash([byte[]]$buf[$sectionTable..($sectionTable + $sections * 40 - 1)])

$machineGuid = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Cryptography" -Name MachineGuid).MachineGuid
$machineUserHash = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($machineGuid + $UserId))

$sig = Get-AuthenticodeSignature -LiteralPath $Path
$signed = $sig.Status -eq "Valid" -and $sig.SignerCertificate
if ($signed) {
  $name = $sig.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
  $certHash = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($name) + [CertPubKeyHash]::Hash($sig.SignerCertificate.Handle))
} else {
  $certHash = [byte[]]::new(32)
}

$flags = 0
if ($signed) { $flags += 1 }
if ($isPe32Plus) { $flags += 2 }

$out = [byte[]](@(1, [byte]$flags) +
  [BitConverter]::GetBytes($fileSize) +
  [BitConverter]::GetBytes($timestamp) +
  [BitConverter]::GetBytes($sizeOfImage) +
  $headerHash + $machineUserHash + $sectionHash + $certHash)

$key = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($UserId + "https://discord.com/careers"))
for ($i = 1; $i -lt $out.Length; $i++) {
  $out[$i] = $out[$i] -bxor $key[($i - 1) -band 31]
}

[Convert]::ToBase64String($out)
'''


def generate_fingerprint(user_id: str, path: str = "", pid: int = 0) -> str:
    if os.name != "nt":
        raise RuntimeError("fingerprint generation is windows-only")
    script = Path(tempfile.gettempdir()) / f"disc_fp_{uuid.uuid4().hex}.ps1"
    script.write_text(_FINGERPRINT_PS1, encoding="utf-8")
    try:
        args = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", str(script), "-UserId", user_id]
        args += (["-ProcessId", str(pid)] if pid else ["-Path", path])
        result = subprocess.run(args, capture_output=True, text=True, timeout=60)
    finally:
        try:
            script.unlink()
        except OSError:
            pass
    if result.returncode != 0:
        lines = (result.stderr or result.stdout or "").strip().splitlines()
        raise RuntimeError(lines[-1] if lines else "powershell failed")
    out = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if not out:
        raise RuntimeError("generator produced no output")
    return out[-1]


@dataclass
class State:
    token: str = ""
    cookie: str = ""
    fingerprint: str = ""
    analytics_token: str = ""
    fetched_at: int = 0
    used_games: list[str] = None
    total_games_claimed: int = 0
    total_hours_claimed: float = 0.0
    subscribed: bool = False
    joined_discord: bool = False

    def __post_init__(self) -> None:
        if self.used_games is None:
            self.used_games = []

    @classmethod
    def load(cls) -> "State":
        if STATE_FILE.exists():
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            state = cls(**{k: data.get(k, v) for k, v in cls().__dict__.items() if k != "used_games"})
            state.used_games = data.get("used_games", [])
            return state
        return cls()

    def save(self) -> None:
        STATE_FILE.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @property
    def is_stale(self) -> bool:
        return not self.analytics_token or (time.time() - self.fetched_at) > AUTH_MAX_AGE

    @property
    def has_cookie(self) -> bool:
        return bool(self.cookie.strip())

    @property
    def has_token(self) -> bool:
        return bool(self.token.strip())


def _local_props() -> dict:
    return {
        "os": "Windows",
        "browser": "Discord Client",
        "release_channel": "stable",
        "client_version": CLIENT_VERSION,
        "os_version": OS_VERSION,
        "os_arch": "x64",
        "app_arch": "x64",
        "system_locale": "en-GB",
        "has_client_mods": False,
        "browser_user_agent": USER_AGENT,
        "browser_version": "42.7.1",
        "os_sdk_version": "26200",
        "client_build_number": CLIENT_BUILD_NUMBER,
        "native_build_number": NATIVE_BUILD_NUMBER,
        "client_event_source": None,
        "client_app_state": "focused",
    }


def build_super_props(launch_signature: str, heartbeat_session: str) -> str:
    try:
        req = urllib.request.Request(PROPERTIES_URL, method="POST", data=b"{}",
                                     headers={"content-type": "application/json", "user-agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as response:
            props = json.loads(response.read().decode("utf-8"))["properties"]
    except Exception:
        props = _local_props()
    props["client_launch_id"] = str(uuid.uuid4())
    props["launch_signature"] = launch_signature
    props["client_heartbeat_session_id"] = heartbeat_session
    raw = json.dumps(props, separators=(",", ":")).encode("utf-8")
    return base64.b64encode(raw).decode("ascii")


def _read_analytics_token(auth_token: str, super_props: str) -> str:
    req = urllib.request.Request(ME_URL, headers={
        "authorization": auth_token,
        "user-agent": USER_AGENT,
        "x-super-properties": super_props,
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"token rejected ({exc.code})") from exc
    token = data.get("analytics_token")
    if not token:
        raise RuntimeError("no analytics_token in response")
    return token


def ensure_token(state: State, super_props: str) -> None:
    if not state.is_stale:
        return
    state.analytics_token = _read_analytics_token(state.token, super_props)
    state.fetched_at = int(time.time())
    state.save()


@dataclass(frozen=True)
class Session:
    heartbeat_session: str
    launch_signature: str
    super_props: str

    @classmethod
    def new(cls) -> "Session":
        hb = str(uuid.uuid4())
        sig = str(uuid.uuid4())
        return cls(hb, sig, build_super_props(sig, hb))


@dataclass(frozen=True)
class Game:
    id: str
    name: str
    exe: str


def _win_exe(game: dict) -> str:
    for entry in game.get("executables", []):
        if entry.get("os") == "win32" and entry.get("name"):
            return entry["name"]
    return "game.exe"


def _download_games() -> str:
    request = urllib.request.Request(GAMES_CDN_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
    try:
        GAMES_FILE.parent.mkdir(parents=True, exist_ok=True)
        GAMES_FILE.write_text(raw, encoding="utf-8")
    except OSError:
        pass
    return raw


def _parse_games(raw: str) -> list[Game]:
    data = json.loads(raw)
    games: list[Game] = []
    seen: set[str] = set()
    for entry in data:
        gid = str(entry.get("id", ""))
        if not gid.isdigit() or gid in seen:
            continue
        if not any(e.get("os") == "win32" and e.get("name") for e in entry.get("executables", [])):
            continue
        seen.add(gid)
        games.append(Game(gid, entry.get("name", "Unknown"), _win_exe(entry)))
    return games


def load_games() -> list[Game]:
    raw = ""
    if GAMES_FILE.exists():
        raw = GAMES_FILE.read_text(encoding="utf-8").strip()
    if raw:
        try:
            games = _parse_games(raw)
            if games:
                return games
        except (json.JSONDecodeError, ValueError):
            pass
    try:
        return _parse_games(_download_games())
    except Exception:
        return []


class ScienceClient:
    def __init__(self, state: State, session: Session) -> None:
        self.state = state
        self.session = session
        self._seq = 0

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def build_launch(self, game: Game) -> dict:
        now = int(time.time() * 1000)
        props = {
            "client_track_timestamp": now,
            "client_heartbeat_session_id": self.session.heartbeat_session,
            "event_sequence_number": self._next_seq(),
            "game": game.name,
            "game_id": game.id,
            "verified": True,
            "elevated": False,
            "is_launcher": False,
            "game_platform": "desktop",
            "detection_method": "verified_game",
            "is_overlay_enabled": False,
            "is_overlay_game_enabled": True,
            "is_overlay_game_source": "OOP_DEFAULT_DATABASE",
            "fullscreen_type": "UNKNOWN",
            "hardware_display_count": 1,
            "overlay_method": "Disabled",
            "activity_status_enabled": True,
            "activity_status_shared_guilds": [],
            "current_user_status": "online",
            "game_detection_enabled": True,
            "executable_path": game.exe,
            "voice_channel_id": None,
            "voice_channel_type": None,
            "voice_channel_bitrate": None,
            "voice_channel_guild_id": None,
            "hidden_by_distributor": False,
            "game_metadata": None,
            "executable_fingerprint": self.state.fingerprint,
            "client_performance_cpu": None,
            "client_performance_memory": None,
            "cpu_core_count": None,
            "accessibility_features": 0,
            "rendered_locale": "en-GB",
            "launch_signature": self.session.launch_signature,
            "client_rtc_state": None,
            "client_app_state": "focused",
            "client_send_timestamp": now,
        }
        if not self.state.fingerprint:
            del props["executable_fingerprint"]
        return {"type": "launch_game", "properties": props}

    def build_heartbeat(self, game: Game, duration_ms: int, session_id: str,
                        initial: bool, final: bool, ts: int | None = None) -> dict:
        ts = int(time.time() * 1000) if ts is None else ts
        return {
            "type": "running_game_heartbeat",
            "properties": {
                "client_track_timestamp": ts,
                "client_heartbeat_session_id": self.session.heartbeat_session,
                "event_sequence_number": self._next_seq(),
                "game_id": game.id,
                "game_name": game.name,
                "game_metadata": None,
                "game_executable": game.exe,
                "game_detection_enabled": True,
                "initial_heartbeat": initial,
                "final_heartbeat": final,
                "game_session_id": session_id,
                "duration_tracked_ms": duration_ms,
                "rtc_connection_id": None,
                "media_session_id": None,
                "launch_signature": self.session.launch_signature,
                "client_app_state": "focused",
                "client_send_timestamp": ts,
            },
        }

    def build_session(self, game: Game, duration_ms: int) -> list[dict]:
        sid = str(uuid.uuid4())
        now = int(time.time() * 1000)
        start = now - duration_ms
        if start < 0:
            start = now
        return [
            self.build_heartbeat(game, 0, sid, initial=True, final=False, ts=start),
            self.build_launch(game),
            self.build_heartbeat(game, duration_ms, sid, initial=False, final=True, ts=now),
        ]

    def post(self, events: Sequence[dict]) -> int:
        payload = {"token": self.state.analytics_token, "events": list(events)}
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "accept": "*/*",
            "accept-language": "en-GB",
            "authorization": self.state.token,
            "content-type": "application/json",
            "cookie": self.state.cookie,
            "origin": "https://discord.com",
            "referer": "https://discord.com/channels/@me",
            "user-agent": USER_AGENT,
            "x-debug-options": "bugReporterEnabled",
            "x-discord-locale": "en-GB",
            "x-discord-timezone": "Europe/Oslo",
            "x-super-properties": self.session.super_props,
        }
        request = urllib.request.Request(SCIENCE_URL, data=body, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            return exc.code
        except Exception:
            return 0


def _chunked(items: Sequence[Game], size: int) -> Iterator[Sequence[Game]]:
    for start in range(0, len(items), size):
        yield items[start:start + size]


class SpooferGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Discord Spoofer GUI")
        self.root.geometry("800x600")
        self.root.resizable(True, True)

        self.state = State.load()
        self.session: Session | None = None
        self.client: ScienceClient | None = None
        self.games: list[Game] = []
        self.running = False

        self._setup_ui()
        self._load_games()

    def _setup_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TNotebook", background="#2b2d31")
        style.configure("TNotebook.Tab", background="#1e1f22", foreground="#ffffff", padding=[20, 10])
        style.map("TNotebook.Tab", background=[("selected", "#5865f2")])
        style.configure("TFrame", background="#2b2d31")
        style.configure("TLabel", background="#2b2d31", foreground="#ffffff", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"))

        notebook = ttk.Notebook(self.root)
        notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.auto_tab = ttk.Frame(notebook)
        self.manual_tab = ttk.Frame(notebook)

        notebook.add(self.auto_tab, text="Auto (Saved Token)")
        notebook.add(self.manual_tab, text="Manual Token")

        self._setup_auto_tab()
        self._setup_manual_tab()

    def _setup_auto_tab(self):
        frame = self.auto_tab

        header = ttk.Label(frame, text="Auto Mode - Using Saved Token", style="Header.TLabel")
        header.pack(pady=20)

        stats_frame = ttk.Frame(frame)
        stats_frame.pack(fill="x", padx=20, pady=10)

        self.games_label = ttk.Label(stats_frame, text="Games: 0")
        self.games_label.pack(anchor="w")

        self.claimed_label = ttk.Label(stats_frame, text="Claimed: 0 games · 0h total")
        self.claimed_label.pack(anchor="w")

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        input_frame = ttk.Frame(frame)
        input_frame.pack(fill="x", padx=20, pady=10)

        ttk.Label(input_frame, text="Number of games:").grid(row=0, column=0, sticky="w", pady=5)
        self.auto_game_count = ttk.Entry(input_frame, width=15)
        self.auto_game_count.insert(0, "10")
        self.auto_game_count.grid(row=0, column=1, sticky="w", padx=10, pady=5)

        ttk.Label(input_frame, text="Hours per game:").grid(row=1, column=0, sticky="w", pady=5)
        self.auto_hours = ttk.Entry(input_frame, width=15)
        self.auto_hours.insert(0, "1")
        self.auto_hours.grid(row=1, column=1, sticky="w", padx=10, pady=5)

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        btn_frame = ttk.Frame(frame)
        btn_frame.pack(fill="x", padx=20, pady=10)

        self.auto_claim_btn = ttk.Button(btn_frame, text="Claim Games", command=self._auto_claim)
        self.auto_claim_btn.pack(side="left", padx=5)

        self.auto_refresh_btn = ttk.Button(btn_frame, text="Refresh Auth", command=self._auto_refresh)
        self.auto_refresh_btn.pack(side="left", padx=5)

        self.auto_fp_btn = ttk.Button(btn_frame, text="Set Fingerprint", command=self._auto_fingerprint)
        self.auto_fp_btn.pack(side="left", padx=5)

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        self.auto_log = scrolledtext.ScrolledText(frame, height=15, bg="#1e1f22", fg="#ffffff",
                                                 font=("Consolas", 9), insertbackground="white")
        self.auto_log.pack(fill="both", expand=True, padx=20, pady=10)

    def _setup_manual_tab(self):
        frame = self.manual_tab

        header = ttk.Label(frame, text="Manual Mode - Paste Token", style="Header.TLabel")
        header.pack(pady=20)

        input_frame = ttk.Frame(frame)
        input_frame.pack(fill="x", padx=20, pady=10)

        ttk.Label(input_frame, text="Discord Token:").grid(row=0, column=0, sticky="w", pady=5)
        self.manual_token = ttk.Entry(input_frame, width=50, show="*")
        self.manual_token.grid(row=0, column=1, sticky="ew", padx=10, pady=5)

        ttk.Label(input_frame, text="CF Clearance Cookie:").grid(row=1, column=0, sticky="w", pady=5)
        self.manual_cookie = ttk.Entry(input_frame, width=50)
        self.manual_cookie.grid(row=1, column=1, sticky="ew", padx=10, pady=5)

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        stats_frame = ttk.Frame(frame)
        stats_frame.pack(fill="x", padx=20, pady=10)

        self.manual_games_label = ttk.Label(stats_frame, text="Games: 0")
        self.manual_games_label.pack(anchor="w")

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        game_input_frame = ttk.Frame(frame)
        game_input_frame.pack(fill="x", padx=20, pady=10)

        ttk.Label(game_input_frame, text="Number of games:").grid(row=0, column=0, sticky="w", pady=5)
        self.manual_game_count = ttk.Entry(game_input_frame, width=15)
        self.manual_game_count.insert(0, "10")
        self.manual_game_count.grid(row=0, column=1, sticky="w", padx=10, pady=5)

        ttk.Label(game_input_frame, text="Hours per game:").grid(row=1, column=0, sticky="w", pady=5)
        self.manual_hours = ttk.Entry(game_input_frame, width=15)
        self.manual_hours.insert(0, "1")
        self.manual_hours.grid(row=1, column=1, sticky="w", padx=10, pady=5)

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        btn_frame = ttk.Frame(frame)
        btn_frame.pack(fill="x", padx=20, pady=10)

        self.manual_claim_btn = ttk.Button(btn_frame, text="Claim Games", command=self._manual_claim)
        self.manual_claim_btn.pack(side="left", padx=5)

        self.manual_fp_btn = ttk.Button(btn_frame, text="Set Fingerprint", command=self._manual_fingerprint)
        self.manual_fp_btn.pack(side="left", padx=5)

        ttk.Separator(frame, orient="horizontal").pack(fill="x", padx=20, pady=15)

        self.manual_log = scrolledtext.ScrolledText(frame, height=10, bg="#1e1f22", fg="#ffffff",
                                                    font=("Consolas", 9), insertbackground="white")
        self.manual_log.pack(fill="both", expand=True, padx=20, pady=10)

    def _load_games(self):
        self._log(self.auto_log, "Loading games...")
        self.games = load_games()
        self.games_label.config(text=f"Games: {len(self.games)}")
        self.manual_games_label.config(text=f"Games: {len(self.games)}")
        self._update_stats()
        if self.games:
            self._log(self.auto_log, f"Loaded {len(self.games)} games")
        else:
            self._log(self.auto_log, "Failed to load games")

    def _update_stats(self):
        self.claimed_label.config(
            text=f"Claimed: {self.state.total_games_claimed} games · {self.state.total_hours_claimed:,.0f}h total"
        )

    def _log(self, widget: scrolledtext.ScrolledText, message: str):
        timestamp = time.strftime("%H:%M:%S")
        widget.insert("end", f"[{timestamp}] {message}\n")
        widget.see("end")
        self.root.update()

    def _new_session(self):
        self.session = Session.new()
        self.client = ScienceClient(self.state, self.session)

    def _auto_claim(self):
        if self.running:
            return
        if not self.state.has_token:
            messagebox.showerror("Error", "No saved token. Save one first.")
            return
        if not self.state.has_cookie:
            messagebox.showerror("Error", "No saved cookie. Set one first.")
            return

        self.running = True
        self.auto_claim_btn.config(state="disabled")

        try:
            self._new_session()
            ensure_token(self.state, self.session.super_props)
            self._log(self.auto_log, "Auth validated")

            try:
                count = int(self.auto_game_count.get())
            except ValueError:
                self._log(self.auto_log, "Invalid game count")
                return
            try:
                hours = float(self.auto_hours.get())
            except ValueError:
                self._log(self.auto_log, "Invalid hours")
                return

            count = min(count, len(self.games))
            selected = self._select_games(count)
            if not selected:
                self._log(self.auto_log, "No games selected")
                return

            duration_ms = int(hours * 3600 * 1000)
            total_hours = len(selected) * hours
            self._log(self.auto_log, f"Claiming {hours}h on {len(selected)} games ({total_hours:,.0f}h total)")

            sent_ok = 0
            for request_no, chunk in enumerate(_chunked(selected, BATCH_SIZE), start=1):
                events = []
                for game in chunk:
                    events.extend(self.client.build_session(game, duration_ms))
                status = self.client.post(events)
                if status == 204:
                    sent_ok += len(chunk)
                    self._log(self.auto_log, f"Batch {request_no}: {sent_ok}/{len(selected)} games")
                elif status in (401, 403):
                    self._log(self.auto_log, f"Batch {request_no}: [{status}] auth rejected")
                    break
                else:
                    self._log(self.auto_log, f"Batch {request_no}: [{status}]")
                time.sleep(BATCH_DELAY)

            self._log(self.auto_log, f"Complete: {sent_ok}/{len(selected)} games · {sent_ok * hours:,.0f}h claimed")
            self.state.total_games_claimed += sent_ok
            self.state.total_hours_claimed += sent_ok * hours
            self.state.save()
            self._update_stats()

        except Exception as e:
            self._log(self.auto_log, f"Error: {e}")
        finally:
            self.running = False
            self.auto_claim_btn.config(state="normal")

    def _auto_refresh(self):
        if not self.state.has_token:
            messagebox.showerror("Error", "No saved token")
            return

        try:
            self._new_session()
            self.state.fetched_at = 0
            ensure_token(self.state, self.session.super_props)
            self.state.save()
            self._log(self.auto_log, "Auth refreshed")
        except Exception as e:
            self._log(self.auto_log, f"Error: {e}")

    def _auto_fingerprint(self):
        if not self.state.has_token:
            messagebox.showerror("Error", "No saved token")
            return

        uid = _user_id_from_token(self.state.token)
        if not uid:
            messagebox.showerror("Error", "Invalid token")
            return

        path = simpledialog.askstring("Fingerprint", "Enter exe path or PID:", parent=self.root)
        if not path:
            return

        self._log(self.auto_log, "Generating fingerprint...")
        try:
            pid = int(path) if path.isdigit() else 0
            exe_path = "" if pid else path
            if exe_path and not Path(exe_path).exists():
                self._log(self.auto_log, f"File not found: {exe_path}")
                return
            fp = generate_fingerprint(uid, path=exe_path, pid=pid)
            self.state.fingerprint = fp
            self.state.save()
            self._log(self.auto_log, f"Fingerprint set ({len(fp)} chars)")
        except Exception as e:
            self._log(self.auto_log, f"Error: {e}")

    def _manual_claim(self):
        if self.running:
            return

        token = self.manual_token.get().strip()
        cookie = self.manual_cookie.get().strip()

        if not token:
            messagebox.showerror("Error", "Enter a token")
            return
        if not cookie:
            messagebox.showerror("Error", "Enter a cookie")
            return

        self.running = True
        self.manual_claim_btn.config(state="disabled")

        temp_state = State(token=token, cookie=cookie)

        try:
            self._new_session()
            self.client = ScienceClient(temp_state, self.session)
            ensure_token(temp_state, self.session.super_props)
            self._log(self.manual_log, "Auth validated")

            try:
                count = int(self.manual_game_count.get())
            except ValueError:
                self._log(self.manual_log, "Invalid game count")
                return
            try:
                hours = float(self.manual_hours.get())
            except ValueError:
                self._log(self.manual_log, "Invalid hours")
                return

            count = min(count, len(self.games))
            selected = self.games[:count]

            duration_ms = int(hours * 3600 * 1000)
            total_hours = len(selected) * hours
            self._log(self.manual_log, f"Claiming {hours}h on {len(selected)} games ({total_hours:,.0f}h total)")

            sent_ok = 0
            for request_no, chunk in enumerate(_chunked(selected, BATCH_SIZE), start=1):
                events = []
                for game in chunk:
                    events.extend(self.client.build_session(game, duration_ms))
                status = self.client.post(events)
                if status == 204:
                    sent_ok += len(chunk)
                    self._log(self.manual_log, f"Batch {request_no}: {sent_ok}/{len(selected)} games")
                elif status in (401, 403):
                    self._log(self.manual_log, f"Batch {request_no}: [{status}] auth rejected")
                    break
                else:
                    self._log(self.manual_log, f"Batch {request_no}: [{status}]")
                time.sleep(BATCH_DELAY)

            self._log(self.manual_log, f"Complete: {sent_ok}/{len(selected)} games · {sent_ok * hours:,.0f}h claimed")

        except Exception as e:
            self._log(self.manual_log, f"Error: {e}")
        finally:
            self.running = False
            self.manual_claim_btn.config(state="normal")

    def _manual_fingerprint(self):
        token = self.manual_token.get().strip()
        if not token:
            messagebox.showerror("Error", "Enter a token first")
            return

        uid = _user_id_from_token(token)
        if not uid:
            messagebox.showerror("Error", "Invalid token")
            return

        path = simpledialog.askstring("Fingerprint", "Enter exe path or PID:", parent=self.root)
        if not path:
            return

        self._log(self.manual_log, "Generating fingerprint...")
        try:
            pid = int(path) if path.isdigit() else 0
            exe_path = "" if pid else path
            if exe_path and not Path(exe_path).exists():
                self._log(self.manual_log, f"File not found: {exe_path}")
                return
            fp = generate_fingerprint(uid, path=exe_path, pid=pid)
            self._log(self.manual_log, f"Fingerprint generated ({len(fp)} chars)")
            self.manual_fp_btn.config(text=f"FP: {fp[:20]}...")
        except Exception as e:
            self._log(self.manual_log, f"Error: {e}")

    def _select_games(self, count: int) -> list[Game]:
        available_ids = {g.id for g in self.games}
        unused_ids = [g.id for g in self.games if g.id not in self.state.used_games]
        used_ids = [gid for gid in self.state.used_games if gid in available_ids]

        if len(unused_ids) >= count:
            selected_ids = unused_ids[:count]
        else:
            selected_ids = unused_ids
            if used_ids:
                remaining = count - len(selected_ids)
                rotated = used_ids[remaining:] + used_ids[:remaining]
                selected_ids.extend(rotated[:remaining])

        self.state.used_games = [gid for gid in self.state.used_games if gid not in selected_ids] + selected_ids
        self.state.save()

        id_map = {g.id: g for g in self.games}
        return [id_map[gid] for gid in selected_ids if gid in id_map]


from tkinter import simpledialog


def main():
    root = tk.Tk()
    app = SpooferGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
