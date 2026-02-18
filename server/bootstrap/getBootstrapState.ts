import * as usersRepository from "../repositories/usersRepository";

export type BootstrapState = {
  needsAdminSetup: boolean;
};

export async function getBootstrapState(): Promise<BootstrapState> {
  const activeAdminCount = await usersRepository.countActiveAdmins();
  return {
    needsAdminSetup: activeAdminCount <= 0,
  };
}
