sudo apt install vim

# ======= ZSH =========
# Link zsh
rm $HOME/.zshrc
ln -s $HOME/dotfiles-vastai/config/zshrc $HOME/.zshrc

rm -rf $HOME/.zsh
mkdir -p $HOME/.zsh
ln -s $HOME/dotfiles-vastai/config/aliases.zsh $HOME/.zsh/aliases.zsh

# Change shell to zsh
yes | chsh -s $(which zsh)

git clone https://github.com/zsh-users/zsh-syntax-highlighting.git
mv zsh-syntax-highlighting ${HOME}/.oh-my-zsh/plugins

# ====== Fuzzer Finder =====
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
yes | ~/.fzf/install

# ======= Pdbpp =========
rm $HOME/.pdbrc.py
rm $HOME/.pdbrc

ln -s $HOME/dotfiles-vastai/config/pdbrc.py $HOME/.pdbrc.py
ln -s $HOME/dotfiles-vastai/config/pdbrc $HOME/.pdbrc

# ======= Pyenv =======
curl https://pyenv.run | bash
yes | sudo apt-get install build-essential zlib1g-dev libffi-dev libssl-dev libbz2-dev libreadline-dev libsqlite3-dev liblzma-dev
yes | sudo apt-get install python3-zipp # for tiktoken
yes | sudo apt-get install python3-dev  # for torch-compile

# ======== Nvtop ======
yes | sudo apt install nvtop

# ====== Expman =========
git clone https://github.com/megvii-research/expman $HOME/.expman
echo '[[ -o interactive ]] && source $HOME/.expman/expman.zsh' >> ~/.zshrc

# ======= vscode extension ==========
rm -rf $HOME/.vscode-server/extensions/
ln -s $HOME/dotfiles-vastai/config/vscode-server/extensions $HOME/.vscode-server
