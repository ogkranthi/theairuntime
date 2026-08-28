import type {
  EvaluationResult,
  FdeGymEnv,
  InterviewSession,
} from "./types";
import { isValidEmail } from "./utils";

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const absoluteLearnPath = (path?: string) =>
  path
    ? `https://learn.theairuntime.com${path.startsWith("/") ? path : `/${path}`}`
    : "https://learn.theairuntime.com/fde-gym/";

function evidenceText(session: InterviewSession, refs: string[]): string[] {
  const turnMap = new Map(session.transcript.map((turn) => [turn.id, turn]));
  const nodeMap = new Map(session.graph.nodes.map((node) => [node.id, node]));
  const edgeMap = new Map(session.graph.edges.map((edge) => [edge.id, edge]));
  const revisionMap = new Map(
    session.revisions.map((revision) => [revision.id, revision]),
  );

  return refs
    .map((ref) => {
      const turn = turnMap.get(ref);
      if (turn) {
        const prefix = turn.role === "candidate" ? "You said" : "Interviewer asked";
        return `${prefix}: ${turn.content.slice(0, 420)}`;
      }
      const node = nodeMap.get(ref);
      if (node) return `Architecture component: ${node.label} (${node.kind})`;
      const edge = edgeMap.get(ref);
      if (edge) return `Architecture connection: ${edge.source} to ${edge.target}`;
      const revision = revisionMap.get(ref);
      if (revision) return `Architecture revision: ${revision.summary}`;
      return "";
    })
    .filter(Boolean)
    .slice(0, 6);
}

function statusCell(value: string) {
  return `<span style="display:inline-block;padding:3px 8px;border:1px solid #d6d6d6;border-radius:999px;font-size:12px">${escapeHtml(value)}</span>`;
}

function competencyRows(evaluation: EvaluationResult): string {
  return evaluation.competencies
    .filter((item) => item.status !== "insufficient")
    .sort((a, b) => b.score - a.score)
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #ececec;vertical-align:top">
            <strong>${escapeHtml(item.label)}</strong><br />
            <span style="color:#5f6368">${escapeHtml(item.summary)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #ececec;text-align:center;white-space:nowrap">
            ${escapeHtml(item.score.toFixed(1))}/10
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #ececec;text-align:center">
            ${statusCell(item.status)}
          </td>
        </tr>`,
    )
    .join("");
}

export function renderReportHtml(session: InterviewSession): string {
  const evaluation = session.evaluation;
  if (!evaluation) throw new Error("Session has no evaluation.");

  const strongestEvidence = evidenceText(
    session,
    evaluation.strongest.evidenceRefs,
  );
  const gapEvidence = evidenceText(
    session,
    evaluation.biggestGap.evidenceRefs,
  );

  const alternatives = evaluation.architectureComparison.alternatives
    .map(
      (item) => `
        <div style="border:1px solid #e4e4e4;border-radius:12px;padding:14px;margin:10px 0">
          <strong>${escapeHtml(item.title)}</strong>
          <p style="margin:8px 0">${escapeHtml(item.summary)}</p>
          <p style="margin:8px 0"><strong>Fits when:</strong> ${escapeHtml(item.fitsWhen)}</p>
          <p style="margin:8px 0"><strong>Tradeoff:</strong> ${escapeHtml(item.tradeoff)}</p>
        </div>`,
    )
    .join("");

  const evidenceList = (items: string[]) =>
    items.length
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>No concise evidence excerpt was available in this attempt.</p>";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f8;color:#111827;font-family:Inter,Arial,sans-serif;line-height:1.55">
    <div style="max-width:720px;margin:0 auto;padding:28px 18px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:26px">
        <p style="font-family:monospace;font-size:12px;letter-spacing:1.4px;margin:0 0 8px;color:#2563eb">FDE GYM BY THE AI RUNTIME</p>
        <h1 style="margin:0 0 6px;font-size:30px">${escapeHtml(evaluation.verdict)}</h1>
        <p style="margin:0 0 22px;font-size:18px"><strong>${evaluation.score}/100</strong> for the ${escapeHtml(evaluation.targetLevel)} target bar</p>

        <h2 style="font-size:19px">Interviewer note</h2>
        <p>${escapeHtml(evaluation.interviewerNote)}</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr>
            <td style="padding:10px;background:#f8fafc"><strong>Foundations</strong></td>
            <td style="padding:10px;background:#f8fafc">${escapeHtml(evaluation.barRelative.foundations)}</td>
          </tr>
          <tr>
            <td style="padding:10px"><strong>FDE</strong></td>
            <td style="padding:10px">${escapeHtml(evaluation.barRelative.fde)}</td>
          </tr>
          <tr>
            <td style="padding:10px;background:#f8fafc"><strong>Senior FDE</strong></td>
            <td style="padding:10px;background:#f8fafc">${escapeHtml(evaluation.barRelative.senior)}</td>
          </tr>
        </table>

        <h2 style="font-size:19px">Strongest area: ${escapeHtml(evaluation.strongest.label)}</h2>
        <p>${escapeHtml(evaluation.strongest.reason)}</p>
        ${evidenceList(strongestEvidence)}

        <h2 style="font-size:19px">Biggest gap: ${escapeHtml(evaluation.biggestGap.label)}</h2>
        <p>${escapeHtml(evaluation.biggestGap.reason)}</p>
        ${evidenceList(gapEvidence)}

        <h2 style="font-size:19px">Competency breakdown</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #d1d5db">Competency</th>
              <th style="padding:8px;text-align:center;border-bottom:2px solid #d1d5db">Score</th>
              <th style="padding:8px;text-align:center;border-bottom:2px solid #d1d5db">Evidence</th>
            </tr>
          </thead>
          <tbody>${competencyRows(evaluation)}</tbody>
        </table>

        <h2 style="font-size:19px">${escapeHtml(evaluation.miniLesson.title)}</h2>
        <p>${escapeHtml(evaluation.miniLesson.body)}</p>
        <blockquote style="margin:14px 0;padding:12px 16px;border-left:4px solid #2563eb;background:#eff6ff">
          <strong>Remember in the next interview:</strong><br />
          ${escapeHtml(evaluation.miniLesson.interviewTakeaway)}
        </blockquote>

        <h2 style="font-size:19px">Your architecture in context</h2>
        <p>${escapeHtml(evaluation.architectureComparison.candidateSummary)}</p>
        <p>There is no single correct diagram. These are three defensible approaches and the tradeoff each accepts.</p>
        ${alternatives}

        <h2 style="font-size:19px">Prescribed next step</h2>
        <p><strong>${escapeHtml(evaluation.nextDrill.title)}</strong></p>
        <p>${escapeHtml(evaluation.nextDrill.reason)}</p>
        <p>
          <a href="${escapeHtml(absoluteLearnPath(evaluation.nextDrill.airResourcePath))}"
             style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:11px 16px;border-radius:8px">
            Open the next AIR resource
          </a>
        </p>

        <p style="margin-top:28px;color:#6b7280;font-size:13px">
          This result evaluates performance in one practice interview. It is not
          a professional certification or hiring guarantee.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function subscribeToAir(
  env: FdeGymEnv,
  email: string,
  session: InterviewSession,
): Promise<boolean> {
  if (!isValidEmail(email)) return false;

  const origin = env.SUBSTACK_ORIGIN ?? "https://theairuntime.com";
  const form = new URLSearchParams();
  form.set("email", email);
  form.set("first_url", "https://learn.theairuntime.com/fde-gym/");
  form.set("first_referrer", "learn.theairuntime.com");
  form.set("source", "fde-gym-report");

  let subscribed = false;
  try {
    const response = await fetch(`${origin}/api/v1/free?nojs=true`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: form.toString(),
    });
    subscribed = response.ok;
  } catch {
    subscribed = false;
  }

  if (env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source: "fde-gym-report",
          sessionId: session.id,
          scenarioId: session.scenarioId,
          verdict: session.evaluation?.verdict ?? null,
          score: session.evaluation?.score ?? null,
          substackForwarded: subscribed,
          ts: new Date().toISOString(),
        }),
      });
    } catch {
      // Best-effort mirror. Never include transcript content.
    }
  }

  return subscribed;
}

export async function sendPersonalizedReport(
  env: FdeGymEnv,
  email: string,
  session: InterviewSession,
): Promise<{ emailed: boolean; webhookDelivered: boolean }> {
  const html = renderReportHtml(session);
  let emailed = false;
  let webhookDelivered = false;

  if (env.RESEND_API_KEY && env.FDE_GYM_FROM_EMAIL) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
          "idempotency-key": `fde-gym-report-${session.id}`.slice(0, 256),
        },
        body: JSON.stringify({
          from: env.FDE_GYM_FROM_EMAIL,
          to: [email],
          subject: `Your FDE Gym result: ${session.evaluation?.verdict ?? "Interview report"}`,
          html,
          text: htmlToText(html),
          ...(env.FDE_GYM_REPLY_TO
            ? { reply_to: env.FDE_GYM_REPLY_TO }
            : {}),
        }),
      });
      emailed = response.ok;
    } catch {
      emailed = false;
    }
  }

  if (env.FDE_GYM_REPORT_WEBHOOK_URL) {
    try {
      const response = await fetch(env.FDE_GYM_REPORT_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          subject: `Your FDE Gym result: ${session.evaluation?.verdict ?? "Interview report"}`,
          html,
          text: htmlToText(html),
          sessionId: session.id,
        }),
      });
      webhookDelivered = response.ok;
    } catch {
      webhookDelivered = false;
    }
  }

  return { emailed, webhookDelivered };
}
