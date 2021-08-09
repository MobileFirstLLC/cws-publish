interface Dictionary {
    zipError: string
    authError: string
}

export const dictionary: Dictionary = {
    zipError: 'FATAL: zip file not found or not readable',
    authError: 'FATAL: authentication failed. At least 1 of arguments: client_id, client_secret, refresh_token; is invalid.'
}

export default dictionary;
