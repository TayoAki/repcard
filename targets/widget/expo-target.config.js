/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  // No `name` override: the target is named after this directory ("widget"),
  // which must NOT collide with the main app target ("RepCard").
  deploymentTarget: "16.4",
  // Shared container with the app so the widget can read the card snapshot.
  entitlements: {
    "com.apple.security.application-groups": ["group.com.tayoaki.repcard"],
  },
};
