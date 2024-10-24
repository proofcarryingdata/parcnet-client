export type UserClosedDialog = {
  type: "user-closed-dialog";
};

export type Errors = UserClosedDialog;

export class UserClosedDialogError extends Error {
  constructor() {
    super("User closed dialog");
  }
}

export class ClientDisconnectedError extends Error {
  constructor() {
    super("Client disconnected");
  }
}
