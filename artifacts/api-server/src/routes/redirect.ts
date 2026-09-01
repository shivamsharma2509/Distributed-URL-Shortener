import { Router, type IRouter } from "express";
import { GetUrlParams } from "@workspace/api-zod";
import { findMapping, findRedirect, incrementClickCount } from "../lib/url-shortener";

const router: IRouter = Router();

// The API service is mounted behind /api in the workspace proxy, so /api/r/:shortCode
// is the routable equivalent of the public redirect endpoint in this environment.
router.get("/r/:shortCode", async (req, res): Promise<void> => {
  const params = GetUrlParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).send("Short URL not found");
    return;
  }
  const mapping = await findRedirect(params.data.shortCode);
  if (!mapping) {
    res.status(404).send("Short URL not found or no longer active");
    return;
  }
  await incrementClickCount(mapping.id);
  res.redirect(302, mapping.originalUrl);
});

export default router;