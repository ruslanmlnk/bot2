import db from "../index.js";

export async function addReferralLink(name: string, refId: string, creatorId: number) {
    return db.query(
        "INSERT INTO referral_links (name, ref_id, creator_id) VALUES ($1, $2, $3)",
        [name, refId, creatorId]
    );
}

export async function deleteReferralLink(id: number) {
    return db.query("DELETE FROM referral_links WHERE id = $1", [id]);
}

export async function listReferralLinks() {
    const res = await db.query("SELECT * FROM referral_links ORDER BY created_at DESC");
    return res.rows as Array<{
        id: number;
        name: string;
        ref_id: string;
        creator_id: number;
        created_at: Date;
    }>;
}

export async function getReferralLinkByRefId(refId: string) {
    const res = await db.query("SELECT * FROM referral_links WHERE ref_id = $1", [refId]);
    return res.rows[0] as {
        id: number;
        name: string;
        ref_id: string;
        creator_id: number;
        created_at: Date;
    } | undefined;
}
