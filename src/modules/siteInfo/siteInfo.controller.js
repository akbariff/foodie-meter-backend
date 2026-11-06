const prisma = require('../../config/db');
const { ok } = require('../../utils/respond');
async function getWebsiteInfo(req, res) {
    const info =await prisma.websiteInfo.upsert({
      where: {id: 'main',},
      update: {},
      create: {id: 'main',},
    });
  ok(res, info);
}
async function updateWebsiteInfo(req, res) {
  const {
    siteName,

    heroHeadingPrimary,
    heroHeadingAccent,
    heroDescription,

    featuresHeading,
    featuresDescription,

    freePlanDescription,
    premiumPlanDescription,

    aboutHeading,
    aboutDescription,
    medicalDisclaimer,

    ctaHeading,
    ctaDescription,

    footerTagline,
    footerCopyright,
  } = req.body;

  const changes = {
    ...(siteName !== undefined ? { siteName } : {}),
    ...(heroHeadingPrimary !== undefined ? { heroHeadingPrimary } : {}),
    ...(heroHeadingAccent !== undefined ? { heroHeadingAccent } : {}),
    ...(heroDescription !== undefined ? { heroDescription } : {}),
    ...(featuresHeading !== undefined ? { featuresHeading } : {}),
    ...(featuresDescription !== undefined ? { featuresDescription } : {}),
    ...(freePlanDescription !== undefined ? { freePlanDescription } : {}),
    ...(premiumPlanDescription !== undefined ? { premiumPlanDescription }: {}),
    ...(aboutHeading !== undefined ? { aboutHeading } : {}),
    ...(aboutDescription !== undefined ? { aboutDescription } : {}),
    ...(medicalDisclaimer !== undefined ? { medicalDisclaimer } : {}),
    ...(ctaHeading !== undefined ? { ctaHeading } : {}),
    ...(ctaDescription !== undefined ? { ctaDescription } : {}),
    ...(footerTagline !== undefined ? { footerTagline } : {}),
    ...(footerCopyright !== undefined ? { footerCopyright } : {}),
  };


  const info = await prisma.websiteInfo.upsert({
      where: {id: 'main',},
      update: changes,
      create: {id: 'main', ...changes,},
    });


  ok( res, info, 'Website information updated');
}


module.exports = { getWebsiteInfo, updateWebsiteInfo,};