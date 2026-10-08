# First public release setup

The reviewed source export has 410 recipes and 756 canonical entries. The five
provenance cases are excluded, licence boundaries are explicit, and existing private
development history is not included. See [validation](RELEASE-VALIDATION.md).

Before creating the first public commit, the owner must choose:

- Public commit author/display name.
- Public email or GitHub noreply address.
- Repository name and URL.

Then initialise a fresh repository on `main`, configure that identity locally,
review the staged files, make the initial commit, create the chosen GitHub repository
and push only after explicit publication authorisation. None of those actions has
been performed. Do not copy private history or local archives into this tree.

Keep both independent non-affiliation notes: [opensauce.com](https://www.opensauce.com/)
and Open Sauce Recipes / historical WordPress plugin. Naming-verification scope
includes both. The older endpoints could not be retrieved; no claims about their
current maintenance or ownership are made. See [prior art](PRIOR-ART.md).

The planned `tebla.net/opensaucefood/` alpha is not deployed. No deployment
credentials or automation are included. Future changes should repeat the validation
commands in the README. Dependency installation/build creates ignored local output;
exclude it from any release archive.
