export type UserClosedDialog = {
  type: "user-closed-dialog";
};

export type Errors = UserClosedDialog;

export class UserClosedDialogError extends Error {
  constructor() {
    super("User closed dialog");
  }
}
