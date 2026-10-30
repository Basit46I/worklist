const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)

/** Inline styles and presentation tables keep transactional emails readable in Gmail and Outlook. */
export const renderWorklistEmail = (input: Readonly<{
    title: string
    description: string
    actionLabel: string
    actionUrl: string
    eyebrow?: string
    details?: readonly Readonly<{ label: string; value: string }>[]
    footer?: string
}>): string => {
    const url = new URL(input.actionUrl)
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Email actions must use an HTTP or HTTPS URL.')
    const e = escapeHtml
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f2f5f1;color:#213b30;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(input.description)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f1"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 0 24px;font-size:22px;font-weight:bold;letter-spacing:-1px;color:#174638">&#10003; Worklist</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e1e8df;border-radius:16px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:6px;background:#174638;border-radius:16px 16px 0 0"></td></tr>
<tr><td style="padding:36px 32px">
<p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#6e8b70">${e(input.eyebrow ?? 'YOUR WORK, TOGETHER')}</p>
<h1 style="margin:0 0 16px;font-size:28px;line-height:36px;letter-spacing:-.7px;color:#173f35">${e(input.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:25px;color:#647269">${e(input.description)}</p>
${input.details?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#f6f8f4;border-radius:8px">${input.details.map((detail) => `<tr><td style="padding:12px 16px;font-size:12px;color:#758178;vertical-align:top;width:90px">${e(detail.label)}</td><td style="padding:12px 16px;font-size:14px;line-height:21px;color:#253f32;overflow-wrap:anywhere">${e(detail.value)}</td></tr>`).join('')}</table>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#174638" style="border-radius:8px;text-align:center"><a href="${e(url.toString())}" style="display:inline-block;padding:15px 24px;border:1px solid #174638;border-radius:8px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none">${e(input.actionLabel)} &rarr;</a></td></tr></table>
<p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#879188">${e(input.footer ?? 'You received this email because of activity in your Worklist workspace.')}</p>
</td></tr></table></td></tr>
<tr><td style="padding:24px 8px;font-size:11px;line-height:18px;color:#8b958e">Button not working? Copy this link into your browser:<br><a href="${e(url.toString())}" style="color:#5c7965;word-break:break-all">${e(url.toString())}</a><p style="margin:20px 0 0">Worklist &middot; A little clarity for every working day.</p></td></tr>
</table></td></tr></table></body></html>`
}
